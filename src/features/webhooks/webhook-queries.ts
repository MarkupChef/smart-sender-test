import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { Api } from '@/api/endpoints';
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
