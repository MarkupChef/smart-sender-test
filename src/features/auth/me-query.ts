import { queryOptions } from '@tanstack/react-query';
import type { Api } from '@/api/endpoints';

export const meQueryKey = ['me'] as const;

export function meQueryOptions(api: Api) {
  return queryOptions({
    queryKey: meQueryKey,
    queryFn: ({ signal }) => api.getMe(signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
