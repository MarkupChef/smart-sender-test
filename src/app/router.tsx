import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { z } from 'zod';
import type { Api } from '@/api/endpoints';
import { LoginPage } from '@/features/auth/login-page';
import { meQueryKey } from '@/features/auth/me-query';
import type { User } from '@/api/schemas';
import { api, setSessionExpiredHandler } from './http';
import { ProtectedLayout } from './protected-layout';
import { queryClient } from './query-client';

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient; api: Api }>()({
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
  component: () => <p className="text-muted-foreground">The webhook list will appear here.</p>,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedRoute.addChildren([webhooksRoute]),
]);

export const router = createRouter({
  routeTree,
  context: { queryClient, api },
});

let expiryInProgress = false;

async function handleSessionExpired(): Promise<void> {
  if (expiryInProgress || queryClient.getQueryData(meQueryKey) === undefined) {
    return;
  }
  expiryInProgress = true;
  try {
    const redirectTo = router.state.location.href;
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: meQueryKey });
    await router.navigate({ to: '/login', search: { reason: 'expired', redirect: redirectTo } });
    queryClient.clear();
  } finally {
    expiryInProgress = false;
  }
}

setSessionExpiredHandler(() => {
  void handleSessionExpired();
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
