import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import type { Api } from '@/api/endpoints';
import { toast } from 'sonner';
import type { Webhook, WebhookInput, WebhookList } from '@/api/schemas';
import type { ListSearch } from './list/list-search';

const WEBHOOK_STALE_TIME_MS = 30_000;

const webhookKeys = {
  lists: ['webhooks', 'list'] as const,
  list: (listSearch: ListSearch) => ['webhooks', 'list', listSearch] as const,
  detail: (id: number) => ['webhooks', 'detail', id] as const,
};

export function webhookListQueryOptions(api: Api, listSearch: ListSearch) {
  return queryOptions({
    queryKey: webhookKeys.list(listSearch),
    queryFn: ({ signal }) => api.listWebhooks(listSearch, signal),
    placeholderData: keepPreviousData,
    staleTime: WEBHOOK_STALE_TIME_MS,
  });
}

export function webhookDetailQueryOptions(api: Api, id: number) {
  return queryOptions({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => api.getWebhook(id, signal),
    staleTime: WEBHOOK_STALE_TIME_MS,
  });
}

export function findCachedWebhook(queryClient: QueryClient, id: number): Webhook | undefined {
  for (const [, list] of queryClient.getQueriesData<WebhookList>({ queryKey: webhookKeys.lists })) {
    const webhook = list?.data.find((item) => item.id === id);
    if (webhook !== undefined) return webhook;
  }
  return undefined;
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient();
  const { api } = useRouteContext({ from: '__root__' });

  return useMutation({
    mutationFn: (input: WebhookInput) => api.updateWebhook(id, input),
    onSuccess: async (updated) => {
      toast.success('Saved');
      queryClient.setQueryData(webhookKeys.detail(id), updated);
      queryClient.setQueriesData<WebhookList>({ queryKey: webhookKeys.lists }, (list) =>
        list === undefined
          ? undefined
          : {
              ...list,
              data: list.data.map((webhook) => (webhook.id === updated.id ? updated : webhook)),
            },
      );
      await queryClient.invalidateQueries({ queryKey: webhookKeys.lists });
    },
  });
}
