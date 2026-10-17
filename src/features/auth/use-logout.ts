import { useMutation } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';

export function useLogout() {
  const { signOut } = useRouteContext({ from: '__root__' });

  return useMutation({ mutationFn: signOut });
}
