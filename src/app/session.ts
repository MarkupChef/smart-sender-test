import type { AnyRouter } from '@tanstack/react-router';
import { createEndpoints, type Api } from '@/api/endpoints';
import { createHttpClient } from '@/api/http-client';
import { meQueryOptions } from '@/features/auth/me-query';
import { ROUTES } from '@/shared/routes';
import { API_BASE_URL } from './http';
import { queryClient } from './query-client';

type SessionEndReason = 'expired' | 'signed-out';

interface Session {
  api: Api;
  signOut: () => Promise<void>;
}

export function createSession(getRouter: () => AnyRouter): Session {
  let signingOut: Promise<void> | undefined;
  let sessionEnding: Promise<void> | undefined;

  const api = createEndpoints(
    createHttpClient({
      baseUrl: API_BASE_URL,
      onSessionExpired: () => {
        if (
          signingOut !== undefined ||
          queryClient.getQueryData(meQueryOptions(api).queryKey) === undefined
        ) {
          return;
        }
        void endSession('expired');
      },
    }),
  );

  function signOut(): Promise<void> {
    signingOut ??= revokeAndEndSession().finally(() => {
      signingOut = undefined;
    });
    return signingOut;
  }

  async function revokeAndEndSession(): Promise<void> {
    await queryClient.cancelQueries();
    await api.revokeSession().catch(() => undefined);
    await endSession('signed-out');
  }

  function endSession(reason: SessionEndReason): Promise<void> {
    sessionEnding ??= tearDownSession(reason).finally(() => {
      sessionEnding = undefined;
    });
    return sessionEnding;
  }

  async function tearDownSession(reason: SessionEndReason): Promise<void> {
    const router = getRouter();
    const redirectTo = router.state.location.href;
    try {
      await queryClient.cancelQueries();
      queryClient.removeQueries({ queryKey: meQueryOptions(api).queryKey });
      await (reason === 'expired' && signingOut === undefined
        ? router.navigate({
            to: ROUTES.login,
            search: { reason: 'expired', redirect: redirectTo },
            replace: true,
          })
        : router.navigate({ to: ROUTES.login, replace: true }));
    } catch (error) {
      console.error(error);
      window.location.replace(ROUTES.login);
    } finally {
      queryClient.clear();
    }
  }

  return { api, signOut };
}
