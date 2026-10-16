import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, expireSession, resetDb, user, USER_PASSWORD } from '@/mocks/db';
import { server, TEST_BASE_URL } from '@/mocks/server';
import { isApiError } from './api-error';
import { createEndpoints } from './endpoints';
import { createHttpClient } from './http-client';

let rotateCalls = 0;
let csrfCalls = 0;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  server.events.on('request:start', ({ request }) => {
    const { pathname } = new URL(request.url);
    if (pathname === '/auth/token/rotate') rotateCalls += 1;
    if (pathname === '/csrf') csrfCalls += 1;
  });
});

beforeEach(() => {
  resetDb();
  rotateCalls = 0;
  csrfCalls = 0;
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

async function signIn() {
  const onSessionExpired = vi.fn<() => void>();
  const api = createEndpoints(createHttpClient({ baseUrl: TEST_BASE_URL, onSessionExpired }));
  const { device_session_token } = await api.login(credentials);
  await api.issueSession({ device_session_token });
  return { api, onSessionExpired };
}

const errorType = (error: unknown) => (isApiError(error) ? error.info.type : undefined);

const unauthenticated = () =>
  HttpResponse.json(
    { error: { type: 'AuthenticationException', message: 'Unauthenticated.' } },
    { status: 401 },
  );

const staleCsrf = () =>
  new HttpResponse(undefined, { status: 204, headers: { 'X-CSRF-TOKEN': 'stale-token' } });

const credentials = { email: user.email, password: USER_PASSWORD };

describe('http client session handling', () => {
  it('two concurrent 401s share a single rotate and both requests succeed', async () => {
    const { api, onSessionExpired } = await signIn();
    expireSession();

    const [me, list] = await Promise.all([api.getMe(), api.listWebhooks({ page: 1, search: '' })]);

    expect(rotateCalls).toBe(1);
    expect(me.email).toBe(user.email);
    expect(list.data).toHaveLength(10);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('a failed rotate ends the session once and is never rotated again', async () => {
    const { api, onSessionExpired } = await signIn();
    endSession();

    const error = await api.getMe().catch((caught: unknown) => caught);

    expect(rotateCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(errorType(error)).toBe('AuthenticationException');
  });

  it('a 401 after a successful rotate ends the session without a second rotate', async () => {
    const { api, onSessionExpired } = await signIn();
    server.use(http.get(`${TEST_BASE_URL}/v1/me`, unauthenticated));

    const error = await api.getMe().catch((caught: unknown) => caught);

    expect(rotateCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(errorType(error)).toBe('AuthenticationException');
  });

  it('concurrent repeated 401s after one rotate end the session once', async () => {
    const { api, onSessionExpired } = await signIn();
    server.use(
      http.get(`${TEST_BASE_URL}/v1/me`, unauthenticated),
      http.get(`${TEST_BASE_URL}/v1/webhooks`, unauthenticated),
    );

    const errors = await Promise.all([
      api.getMe().catch((caught: unknown) => caught),
      api.listWebhooks({ page: 1, search: '' }).catch((caught: unknown) => caught),
    ]);

    expect(rotateCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(errors.map(errorType)).toEqual(['AuthenticationException', 'AuthenticationException']);
  });

  it('a 401 arriving after a failed rotate settled neither rotates nor notifies again', async () => {
    const { api, onSessionExpired } = await signIn();
    endSession();
    server.use(
      http.get(`${TEST_BASE_URL}/v1/me`, async () => {
        await delay(50);
        return unauthenticated();
      }),
    );

    const errors = await Promise.all([
      api.getMe().catch((caught: unknown) => caught),
      api.listWebhooks({ page: 1, search: '' }).catch((caught: unknown) => caught),
    ]);

    expect(rotateCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(errors.map(errorType)).toEqual(['AuthenticationException', 'AuthenticationException']);
  });

  it('a network error during rotate is rethrown and does not end the session', async () => {
    const { api, onSessionExpired } = await signIn();
    expireSession();
    server.use(http.post(`${TEST_BASE_URL}/auth/token/rotate`, () => HttpResponse.error()));

    const error = await api.getMe().catch((caught: unknown) => caught);

    expect(errorType(error)).toBe('NetworkError');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('a request aborted before its 401 is handled neither rotates nor ends the session', async () => {
    const { api, onSessionExpired } = await signIn();
    const controller = new AbortController();
    server.use(
      http.get(`${TEST_BASE_URL}/v1/me`, () => {
        controller.abort();
        return unauthenticated();
      }),
    );

    const error = await api.getMe(controller.signal).catch((caught: unknown) => caught);

    expect(controller.signal.aborted).toBe(true);
    expect(isApiError(error)).toBe(false);
    expect(rotateCalls).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe('http client CSRF handling', () => {
  it('concurrent 419s share one CSRF refetch and each request is retried once', async () => {
    const api = createEndpoints(
      createHttpClient({ baseUrl: TEST_BASE_URL, onSessionExpired: vi.fn<() => void>() }),
    );
    server.use(http.get(`${TEST_BASE_URL}/csrf`, staleCsrf, { once: true }));

    const results = await Promise.all([api.login(credentials), api.login(credentials)]);

    expect(csrfCalls).toBe(2);
    expect(results.every((result) => result.device_session_token !== '')).toBe(true);
  });

  it('a second 419 is not retried and rejects with TokenMismatchException', async () => {
    const api = createEndpoints(
      createHttpClient({ baseUrl: TEST_BASE_URL, onSessionExpired: vi.fn<() => void>() }),
    );
    server.use(http.get(`${TEST_BASE_URL}/csrf`, staleCsrf));

    const error = await api.login(credentials).catch((caught: unknown) => caught);

    expect(csrfCalls).toBe(2);
    expect(errorType(error)).toBe('TokenMismatchException');
  });
});
