import { Outlet, useRouteContext } from '@tanstack/react-router';

export function ProtectedLayout() {
  const { me } = useRouteContext({ from: '/_protected' });

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <span className="font-heading text-lg font-semibold">Smart Sender</span>
          <span className="text-sm text-muted-foreground">{me.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
