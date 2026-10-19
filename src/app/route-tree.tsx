import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  Outlet,
  redirect,
  stripSearchParams,
} from '@tanstack/react-router';
import type { Api } from '@/api/endpoints';
import { LoginPage } from '@/features/auth/login-page';
import { loginSearchSchema } from '@/features/auth/login-search';
import { meQueryOptions } from '@/features/auth/me-query';
import { listSearchDefaults, listSearchSchema } from '@/features/webhooks/list/list-search';
import { WebhookEditPage } from '@/features/webhooks/edit/webhook-edit-page';
import { parseWebhookId } from '@/features/webhooks/edit/webhook-id';
import {
  webhookDetailQueryOptions,
  webhookListQueryOptions,
} from '@/features/webhooks/webhook-queries';
import { WebhooksPage } from '@/features/webhooks/list/webhooks-page';
import { ROUTES, ROUTE_IDS } from '@/shared/routes';
import { ProtectedLayout } from './protected-layout';

export interface RouterContext {
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
  path: ROUTES.home,
  beforeLoad: () => {
    throw redirect({ to: ROUTES.webhooks });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.login,
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.queryClient.getQueryData(meQueryOptions(context.api).queryKey) !== undefined) {
      throw search.redirect === undefined
        ? redirect({ to: ROUTES.webhooks })
        : redirect({ href: search.redirect });
    }
  },
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: ROUTE_IDS.protected,
  beforeLoad: ({ context, location }) => {
    const me = context.queryClient.getQueryData(meQueryOptions(context.api).queryKey);
    if (me === undefined) {
      throw redirect({ to: ROUTES.login, search: { redirect: location.href } });
    }
    return { me };
  },
  component: ProtectedLayout,
});

const webhooksRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: ROUTES.webhooks,
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
  path: ROUTES.webhookEdit,
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

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedRoute.addChildren([webhooksRoute, webhookEditRoute]),
]);
