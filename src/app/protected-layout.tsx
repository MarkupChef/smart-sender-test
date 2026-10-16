import { Outlet, useRouteContext } from '@tanstack/react-router';
import { useLogout } from '@/features/auth/use-logout';
import { Button } from '@/shared/ui/button';

export function ProtectedLayout() {
  const { me } = useRouteContext({ from: '/_protected' });
  const logout = useLogout();

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <span className="font-heading text-lg font-semibold">Smart Sender</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{me.name}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() => {
                logout.mutate();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
