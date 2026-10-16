import type { ZodType } from 'zod';
import { ApiError, isApiError, toApiError } from './api-error';
import { getFingerprint } from './fingerprint';

// Transport (research R5, contracts/http-client.md). Guarantees:
// - single-flight: concurrent first calls share one GET /csrf, concurrent 401s share one rotate;
//   a 401 for a request sent before the latest rotate settled reuses its outcome instead of rotating;
// - onSessionExpired fires once per settled rotate, however many requests end up rejected by it;
// - a transient rotate failure (network, 5xx) is rethrown as is and does not end the session;
// - rotate never rotates: it is sent with auth 'none', so its own failure cannot start a rotate;
// - each request is retried at most once per error class (419 → new CSRF, 401 → rotate).

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: unknown;
  auth: 'session' | 'none';
  captcha?: boolean;
}

export interface HttpClient {
  request<T>(opts: RequestOptions & { schema: ZodType<T> }): Promise<T>;
  request(opts: RequestOptions): Promise<undefined>;
}

const sessionExpired = () =>
  new ApiError({ type: 'AuthenticationException', message: 'The session has ended.' });

// Only a server verdict on the session ends it; a lost connection or a 5xx may still be renewed.
const isTransient = (error: unknown) =>
  !isApiError(error) ||
  error.info.type === 'NetworkError' ||
  (error.info.type === 'UnknownError' && error.info.status >= 500);

export function createHttpClient(options: {
  baseUrl: string;
  onSessionExpired: () => void;
}): HttpClient {
  let csrfPromise: Promise<string> | undefined;
  let rotatePromise: Promise<void> | undefined;
  let settledRotations = 0; // rotates that got a server verdict, successful or not
  let lastRotateFailed = false;
  let notifiedRotation = -1;

  function endSession(): ApiError {
    if (notifiedRotation !== settledRotations) {
      notifiedRotation = settledRotations;
      options.onSessionExpired();
    }
    return sessionExpired();
  }

  async function send(opts: RequestOptions, csrf?: string): Promise<Response> {
    const headers = new Headers({ 'X-Requested-With': 'XMLHttpRequest' });
    if (opts.body !== undefined) headers.set('Content-Type', 'application/json');
    if (csrf !== undefined) headers.set('X-CSRF-TOKEN', csrf);
    if (opts.captcha) headers.set('X-Captcha-Token', 'dev-captcha');
    try {
      return await fetch(`${options.baseUrl}${opts.path}`, {
        method: opts.method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
    } catch {
      throw new ApiError({ type: 'NetworkError', message: 'The network request failed.' });
    }
  }

  async function fetchCsrf(): Promise<string> {
    const response = await send({ method: 'GET', path: '/csrf', auth: 'none' });
    if (!response.ok) throw await toApiError(response);
    const token = response.headers.get('X-CSRF-TOKEN');
    if (!token) {
      throw new ApiError({
        type: 'UnknownError',
        status: response.status,
        message: 'No CSRF token.',
      });
    }
    return token;
  }

  function ensureCsrf(): Promise<string> {
    csrfPromise ??= fetchCsrf().catch((error: unknown) => {
      csrfPromise = undefined;
      throw error;
    });
    return csrfPromise;
  }

  function rotateOnce(): Promise<void> {
    rotatePromise ??= (async () => {
      try {
        const body = { fingerprint: getFingerprint() };
        await execute({ method: 'POST', path: '/auth/token/rotate', body, auth: 'none' });
        settledRotations += 1;
        lastRotateFailed = false;
      } catch (error) {
        if (isTransient(error)) throw error;
        settledRotations += 1;
        lastRotateFailed = true;
        throw endSession();
      } finally {
        rotatePromise = undefined;
      }
    })();
    return rotatePromise;
  }

  async function execute(opts: RequestOptions): Promise<Response> {
    let csrfRetried = false;
    let authRetried = false;
    for (;;) {
      const rotationsBeforeSend = settledRotations;
      const csrfRequest = ensureCsrf();
      const csrf = await csrfRequest;
      const response = await send(opts, opts.method === 'GET' ? undefined : csrf);

      if (response.status === 419 && !csrfRetried) {
        csrfRetried = true;
        await response.body?.cancel(); // release the connection before the retry
        if (csrfPromise === csrfRequest) csrfPromise = undefined; // concurrent 419s refetch once
        continue;
      }
      if (response.status === 401 && opts.auth === 'session') {
        await response.body?.cancel();
        if (authRetried) throw endSession();
        authRetried = true;
        if (rotationsBeforeSend === settledRotations) await rotateOnce();
        else if (lastRotateFailed) throw endSession();
        continue;
      }
      if (!response.ok) throw await toApiError(response);
      return response;
    }
  }

  function request<T>(opts: RequestOptions & { schema: ZodType<T> }): Promise<T>;
  function request(opts: RequestOptions): Promise<undefined>;
  async function request<T>(
    opts: RequestOptions & { schema?: ZodType<T> },
  ): Promise<T | undefined> {
    const response = await execute(opts);
    if (opts.schema === undefined) return undefined;

    const body: unknown = await response.json().catch(() => undefined);
    const parsed = opts.schema.safeParse(body);
    if (!parsed.success) {
      if (import.meta.env.DEV) console.error(`Schema mismatch: ${opts.path}`, parsed.error.issues);
      throw new ApiError({
        type: 'SchemaMismatch',
        message: 'The server response has an unexpected shape.',
        issues: parsed.error.issues,
      });
    }
    return parsed.data;
  }

  return { request };
}
