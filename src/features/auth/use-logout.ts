import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouteContext } from '@tanstack/react-router';
import { meQueryKey } from './me-query';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { api } = useRouteContext({ from: '__root__' });

  return useMutation({
    mutationFn: () => api.revokeSession(),
    onSettled: async () => {
      await queryClient.cancelQueries();
      queryClient.removeQueries({ queryKey: meQueryKey });
      await navigate({ to: '/login', replace: true });
      queryClient.clear();
    },
  });
}
