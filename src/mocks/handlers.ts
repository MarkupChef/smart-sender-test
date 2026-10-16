import type { PathParams } from 'msw';
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { z } from 'zod';
import { webhookInputSchema, type ErrorType } from '@/api/schemas';
import { CSRF_TOKEN, db, user, USER_PASSWORD } from './db';

// Contract: specs/001-webhooks-admin-app/contracts/http-api.md
// Over ~150 lines on purpose: one file mirrors the contract table 1:1, so it reads as a spec.

type Resolve = (request: Request, params: PathParams) => Response | Promise<Response>;

const bodySchema = z.record(z.string(), z.unknown()).catch({});

function error(
  status: number,
  type: ErrorType,
  message: string,
  payload?: Record<string, string[]>,
) {
  return HttpResponse.json({ error: { type, message, payload } }, { status });
}

const invalid = (payload: Record<string, string[]>) =>
  error(422, 'ValidationException', 'The given data was invalid.', payload);

const empty = (status: number) => new HttpResponse(undefined, { status });

async function readBody(request: Request): Promise<Record<string, string>> {
  const raw = bodySchema.parse(await request.json().catch(() => undefined));
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
  );
}

function rejectHeaders(request: Request): Response | undefined {
  if (request.headers.get('X-Requested-With') !== 'XMLHttpRequest') {
    return error(400, 'BadRequestException', 'The X-Requested-With header is required.');
  }
  // CSRF is checked before any other validation.
  if (request.method !== 'GET' && request.headers.get('X-CSRF-TOKEN') !== CSRF_TOKEN) {
    return error(419, 'TokenMismatchException', 'CSRF token mismatch.');
  }
  return undefined;
}

const isSessionActive = () => db.session !== undefined && Date.now() < db.session.expiresAt;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function createHandlers(baseUrl: string) {
  const route = (method: 'get' | 'post' | 'put', path: string, resolve: Resolve) =>
    http[method](
      `${baseUrl}${path}`,
      ({ request, params }) => rejectHeaders(request) ?? resolve(request, params),
    );

  const protectedRoute = (method: 'get' | 'put', path: string, resolve: Resolve) =>
    route(method, path, async (request, params) => {
      if (!isSessionActive()) return error(401, 'AuthenticationException', 'Unauthenticated.');
      await delay();
      return resolve(request, params);
    });

  const findWebhookIndex = (params: PathParams) =>
    db.webhooks.findIndex((webhook) => String(webhook.id) === params.id);

  return [
    route(
      'get',
      '/csrf',
      () => new HttpResponse(undefined, { status: 204, headers: { 'X-CSRF-TOKEN': CSRF_TOKEN } }),
    ),

    route('post', '/auth/login', async (request) => {
      if (!request.headers.get('X-Captcha-Token')) {
        return invalid({ captcha: ['The captcha field is required.'] });
      }
      const { email = '', password = '', fingerprint = '' } = await readBody(request);
      const missing: Record<string, string[]> = {};
      if (email === '') missing.email = ['The email field is required.'];
      if (password === '') missing.password = ['The password field is required.'];
      if (fingerprint === '') missing.fingerprint = ['The fingerprint field is required.'];
      if (Object.keys(missing).length > 0) return invalid(missing);
      if (email !== user.email || password !== USER_PASSWORD) {
        return invalid({ password: ['These credentials do not match our records.'] });
      }
      const token = crypto.randomUUID();
      db.deviceTokens.set(token, fingerprint);
      return HttpResponse.json({ device_session_token: token });
    }),

    route('post', '/auth/token/issue', async (request) => {
      const { device_session_token: token = '', fingerprint = '' } = await readBody(request);
      const owner = db.deviceTokens.get(token);
      if (owner === undefined || owner !== fingerprint) {
        return invalid({ device_session_token: ['The device session token is invalid.'] });
      }
      db.deviceTokens.delete(token);
      db.session = { fingerprint: owner, expiresAt: Date.now() + db.sessionTtlMs };
      return empty(200);
    }),

    // Rotate renews an expired session too; it fails only without a session or on a foreign device.
    route('post', '/auth/token/rotate', async (request) => {
      const { fingerprint } = await readBody(request);
      if (!db.session || db.session.fingerprint !== fingerprint) {
        return error(400, 'BadRequestException', 'There is no session to rotate.');
      }
      db.session.expiresAt = Date.now() + db.sessionTtlMs;
      return empty(200);
    }),

    route('post', '/auth/token/revoke', () => {
      db.session = undefined;
      return empty(204);
    }),

    protectedRoute('get', '/v1/me', () => HttpResponse.json(user)),

    protectedRoute('get', '/v1/webhooks', (request) => {
      const query = new URL(request.url).searchParams;
      const page = positiveInt(query.get('page') ?? undefined, 1);
      const limit = positiveInt(query.get('limit') ?? undefined, 10);
      const search = (query.get('search') ?? '').trim().toLowerCase();
      const found = db.webhooks.filter((webhook) => webhook.name.toLowerCase().includes(search));
      return HttpResponse.json({
        data: found.slice((page - 1) * limit, page * limit),
        paging: {
          pages: { current: page, last: Math.max(1, Math.ceil(found.length / limit)) },
          results: { total: found.length, limitation: limit },
        },
      });
    }),

    protectedRoute('get', '/v1/webhooks/:id', (_request, params) => {
      const webhook = db.webhooks[findWebhookIndex(params)];
      return webhook
        ? HttpResponse.json(webhook)
        : error(404, 'NotFoundException', 'Webhook not found.');
    }),

    // Order of checks: CSRF → session → existence → validation.
    protectedRoute('put', '/v1/webhooks/:id', async (request, params) => {
      const index = findWebhookIndex(params);
      const webhook = db.webhooks[index];
      if (!webhook) return error(404, 'NotFoundException', 'Webhook not found.');

      const { name = '', url = '' } = await readBody(request);
      const errors: Record<string, string[]> = {};
      if (!webhookInputSchema.shape.name.safeParse(name).success) {
        errors.name = ['The name field is required.'];
      }
      if (!webhookInputSchema.shape.url.safeParse(url).success) {
        errors.url = ['The url must be a valid URL.'];
      }
      if (Object.keys(errors).length > 0) return invalid(errors);
      if (db.updateShouldFail) {
        db.updateShouldFail = false;
        return invalid({ url: ['The url must be a valid URL.'] });
      }

      const updated = { ...webhook, name: name.trim(), url: url.trim() };
      db.webhooks[index] = updated;
      return HttpResponse.json(updated);
    }),
  ];
}
