import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import type { Api } from '@/api/endpoints';
import { toast } from 'sonner';
import type { WebhookInput, WebhookList } from '@/api/schemas';
import type { ListSearch } from './list-search';

export function webhookListQueryOptions(api: Api, { page, search }: ListSearch) {
  return queryOptions({
    queryKey: ['webhooks', 'list', { page, search }],
    queryFn: ({ signal }) => api.listWebhooks({ page, search }, signal),
    placeholderData: keepPreviousData,
  });
}

export function webhookDetailQueryOptions(api: Api, id: number) {
  return queryOptions({
    queryKey: ['webhooks', 'detail', id],
    queryFn: ({ signal }) => api.getWebhook(id, signal),
  });
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient();
  const { api } = useRouteContext({ from: '__root__' });

  return useMutation({
    mutationFn: (input: WebhookInput) => api.updateWebhook(id, input),
    onSuccess: async (updated) => {
      toast.success('Saved');
      queryClient.setQueryData(webhookDetailQueryOptions(api, id).queryKey, updated);
      queryClient.setQueriesData<WebhookList>({ queryKey: ['webhooks', 'list'] }, (list) =>
        list === undefined
          ? undefined
          : {
              ...list,
              data: list.data.map((webhook) => (webhook.id === updated.id ? updated : webhook)),
            },
      );
      await queryClient.invalidateQueries({ queryKey: ['webhooks', 'list'] });
    },
  });
}
