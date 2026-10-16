import { getFingerprint } from './fingerprint';
import type { HttpClient } from './http-client';
import {
  loginResponseSchema,
  userSchema,
  webhookListSchema,
  webhookSchema,
  type LoginInput,
  type LoginResponse,
  type WebhookInput,
} from './schemas';

const PAGE_SIZE = 10;

export function createEndpoints(client: HttpClient) {
  return {
    login: (input: LoginInput) =>
      client.request({
        method: 'POST',
        path: '/auth/login',
        body: { ...input, fingerprint: getFingerprint() },
        auth: 'none',
        captcha: true,
        schema: loginResponseSchema,
      }),

    issueSession: (input: LoginResponse) =>
      client.request({
        method: 'POST',
        path: '/auth/token/issue',
        body: { ...input, fingerprint: getFingerprint() },
        auth: 'none',
      }),

    revokeSession: () =>
      client.request({
        method: 'POST',
        path: '/auth/token/revoke',
        body: { fingerprint: getFingerprint() },
        auth: 'none',
      }),

    getMe: (signal?: AbortSignal) =>
      client.request({
        method: 'GET',
        path: '/v1/me',
        auth: 'session',
        schema: userSchema,
        signal,
      }),

    listWebhooks: ({ page, search }: { page: number; search: string }, signal?: AbortSignal) => {
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search !== '') query.set('search', search);
      return client.request({
        method: 'GET',
        path: `/v1/webhooks?${query.toString()}`,
        auth: 'session',
        schema: webhookListSchema,
        signal,
      });
    },

    getWebhook: (id: number, signal?: AbortSignal) =>
      client.request({
        method: 'GET',
        path: `/v1/webhooks/${String(id)}`,
        auth: 'session',
        schema: webhookSchema,
        signal,
      }),

    updateWebhook: (id: number, input: WebhookInput) =>
      client.request({
        method: 'PUT',
        path: `/v1/webhooks/${String(id)}`,
        body: input,
        auth: 'session',
        schema: webhookSchema,
      }),
  };
}

export type Api = ReturnType<typeof createEndpoints>;
