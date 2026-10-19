import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import { queryClient } from './query-client';
import { routeTree } from './route-tree';
import { createSession } from './session';

const { api, signOut } = createSession(() => router);

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
