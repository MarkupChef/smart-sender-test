import { queryOptions } from '@tanstack/react-query';
import type { Api } from '@/api/endpoints';

export function meQueryOptions(api: Api) {
  return queryOptions({
    queryKey: ['me'] as const,
    queryFn: ({ signal }) => api.getMe(signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
