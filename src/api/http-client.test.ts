import { http, HttpResponse } from 'msw/http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, expireSession, resetDb, user, USER_PASSWORD } from '@/mocks/db';
import { server, TEST_BASE_URL } from '@/mocks/server';
import { isApiError } from './api-error';
import { createEndpoints } from './endpoints';
import { createHttpClient } from './http-client';

let rotateCalls = 0;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === '/auth/token/rotate') rotateCalls += 1;
  });
});

beforeEach(() => {
  resetDb();
  rotateCalls = 0;
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
  const { device_session_token } = await api.login({
    email: user.email,
    password: USER_PASSWORD,
  });
  await api.issueSession({ device_session_token });
  return { api, onSessionExpired };
}

const errorType = (error: unknown) => (isApiError(error) ? error.info.type : undefined);

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
    server.use(
      http.get(`${TEST_BASE_URL}/v1/me`, () =>
        HttpResponse.json(
          { error: { type: 'AuthenticationException', message: 'Unauthenticated.' } },
          { status: 401 },
        ),
      ),
    );

    const error = await api.getMe().catch((caught: unknown) => caught);

    expect(rotateCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(errorType(error)).toBe('AuthenticationException');
  });
});
