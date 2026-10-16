import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';

export const logoutMutationKey = ['logout'] as const;

export function useLogout() {
  const queryClient = useQueryClient();
  const { api, endSession } = useRouteContext({ from: '__root__' });

  return useMutation({
    mutationKey: logoutMutationKey,
    mutationFn: async () => {
      await queryClient.cancelQueries();
      await api.revokeSession();
    },
    onSettled: () => endSession('signed-out'),
  });
}
