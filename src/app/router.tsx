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
import { createEndpoints, type Api } from '@/api/endpoints';
import { createHttpClient } from '@/api/http-client';
import { LoginPage } from '@/features/auth/login-page';
import { loginSearchSchema } from '@/features/auth/login-search';
import { meQueryOptions } from '@/features/auth/me-query';
import { listSearchDefaults, listSearchSchema } from '@/features/webhooks/list-search';
import { WebhookEditPage } from '@/features/webhooks/webhook-edit-page';
import { parseWebhookId } from '@/features/webhooks/webhook-id';
import {
  webhookDetailQueryOptions,
  webhookListQueryOptions,
} from '@/features/webhooks/webhook-queries';
import { WebhooksPage } from '@/features/webhooks/webhooks-page';
import { API_BASE_URL } from './http';
import { ProtectedLayout } from './protected-layout';
import { queryClient } from './query-client';

type SessionEndReason = 'expired' | 'signed-out';

interface RouterContext {
  queryClient: QueryClient;
  api: Api;
  signOut: () => Promise<void>;
}

function prefetch(query: Promise<unknown>): void {
  void query.catch(() => undefined);
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

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.queryClient.getQueryData(meQueryOptions(context.api).queryKey) !== undefined) {
      throw search.redirect === undefined
        ? redirect({ to: '/webhooks' })
        : redirect({ href: search.redirect });
    }
  },
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_protected',
  beforeLoad: ({ context, location }) => {
    const me = context.queryClient.getQueryData(meQueryOptions(context.api).queryKey);
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
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    prefetch(context.queryClient.query(webhookListQueryOptions(context.api, deps)));
  },
  component: WebhooksPage,
});

const webhookEditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/webhooks/$webhookId',
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams(listSearchDefaults)] },
  loader: ({ context, params }) => {
    const webhookId = parseWebhookId(params.webhookId);
    if (webhookId !== undefined) {
      prefetch(context.queryClient.query(webhookDetailQueryOptions(context.api, webhookId)));
    }
    return { webhookId };
  },
  component: WebhookEditPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedRoute.addChildren([webhooksRoute, webhookEditRoute]),
]);

let signingOut: Promise<void> | undefined;

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

let sessionEnding: Promise<void> | undefined;

function endSession(reason: SessionEndReason): Promise<void> {
  sessionEnding ??= tearDownSession(reason).finally(() => {
    sessionEnding = undefined;
  });
  return sessionEnding;
}

async function tearDownSession(reason: SessionEndReason): Promise<void> {
  const redirectTo = router.state.location.href;
  try {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: meQueryOptions(api).queryKey });
    await (reason === 'expired' && signingOut === undefined
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
  context: { queryClient, api, signOut },
  defaultPreload: 'intent',
  parseSearch: parseSearchWith((value) => value),
  stringifySearch: stringifySearchWith(JSON.stringify),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
