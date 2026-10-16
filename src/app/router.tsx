import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  parseSearchWith,
  redirect,
  stringifySearchWith,
  stripSearchParams,
} from '@tanstack/react-router';
import { z } from 'zod';
import { createEndpoints, type Api } from '@/api/endpoints';
import { createHttpClient } from '@/api/http-client';
import { LoginPage } from '@/features/auth/login-page';
import { meQueryKey } from '@/features/auth/me-query';
import { logoutMutationKey } from '@/features/auth/use-logout';
import { listSearchDefaults, listSearchSchema } from '@/features/webhooks/list-search';
import { WebhookEditPage } from '@/features/webhooks/webhook-edit-page';
import { WebhooksPage } from '@/features/webhooks/webhooks-page';
import type { User } from '@/api/schemas';
import { API_BASE_URL } from './http';
import { ProtectedLayout } from './protected-layout';
import { queryClient } from './query-client';

type SessionEndReason = 'expired' | 'signed-out';

interface RouterContext {
  queryClient: QueryClient;
  api: Api;
  endSession: (reason: SessionEndReason) => Promise<void>;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/webhooks' });
  },
});

const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.literal('expired').optional().catch(undefined),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.queryClient.getQueryData(meQueryKey) !== undefined) {
      throw redirect({ to: '/webhooks' });
    }
  },
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_protected',
  beforeLoad: ({ context, location }) => {
    const me = context.queryClient.getQueryData<User>(meQueryKey);
    if (me === undefined) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { me };
  },
  component: ProtectedLayout,
});

const webhooksRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/webhooks',
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams(listSearchDefaults)] },
  component: WebhooksPage,
});

const webhookIdPattern = /^[1-9]\d*$/;

function parseWebhookId(raw: string): number | undefined {
  if (!webhookIdPattern.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : undefined;
}

const webhookEditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/webhooks/$webhookId',
  params: {
    parse: ({ webhookId }) => ({ webhookId: parseWebhookId(webhookId) }),
    stringify: ({ webhookId }) => ({ webhookId: webhookId === undefined ? '' : String(webhookId) }),
  },
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams(listSearchDefaults)] },
  component: WebhookEditPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedRoute.addChildren([webhooksRoute, webhookEditRoute]),
]);

const api = createEndpoints(
  createHttpClient({
    baseUrl: API_BASE_URL,
    onSessionExpired: () => {
      if (queryClient.getQueryData(meQueryKey) !== undefined) void endSession('expired');
    },
  }),
);

let sessionEnding: Promise<void> | undefined;

function endSession(reason: SessionEndReason): Promise<void> {
  const signingOut = queryClient.isMutating({ mutationKey: logoutMutationKey }) > 0;
  sessionEnding ??= tearDownSession(signingOut ? 'signed-out' : reason).finally(() => {
    sessionEnding = undefined;
  });
  return sessionEnding;
}

async function tearDownSession(reason: SessionEndReason): Promise<void> {
  const redirectTo = router.state.location.href;
  try {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: meQueryKey });
    await (reason === 'expired'
      ? router.navigate({
          to: '/login',
          search: { reason: 'expired', redirect: redirectTo },
          replace: true,
        })
      : router.navigate({ to: '/login', replace: true }));
  } catch (error) {
    console.error(error);
    window.location.replace('/login');
  } finally {
    queryClient.clear();
  }
}

export const router = createRouter({
  routeTree,
  context: { queryClient, api, endSession },
  parseSearch: parseSearchWith((value) => value),
  stringifySearch: stringifySearchWith(JSON.stringify),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
