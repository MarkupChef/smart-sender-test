import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import type { LoginInput } from '@/api/schemas';
import { meQueryOptions } from './me-query';

export function useLogin() {
  const queryClient = useQueryClient();
  const { api } = useRouteContext({ from: '__root__' });

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { device_session_token } = await api.login(input);
      await api.issueSession({ device_session_token });
      return queryClient.query(meQueryOptions(api));
    },
  });
}
