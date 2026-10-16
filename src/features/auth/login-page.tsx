import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/api/api-error';
import { loginInputSchema, type LoginInput } from '@/api/schemas';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useLogin } from './use-login';

const GENERIC_ERROR = 'Sign-in failed. Please try again.';

function isLoginField(field: string): field is keyof LoginInput {
  return field === 'email' || field === 'password';
}

function applyServerError(error: unknown, setError: UseFormSetError<LoginInput>): void {
  if (!isApiError(error)) {
    setError('root.server', { message: GENERIC_ERROR });
    return;
  }
  const { info } = error;
  switch (info.type) {
    case 'ValidationException': {
      let rootMessage: string | undefined;
      let hasFieldError = false;
      for (const [field, messages] of Object.entries(info.fields)) {
        const message = messages[0];
        if (message === undefined) continue;
        if (isLoginField(field)) {
          setError(field, { message });
          hasFieldError = true;
        } else {
          rootMessage ??= message;
        }
      }
      if (rootMessage === undefined && !hasFieldError) rootMessage = info.message;
      if (rootMessage !== undefined) setError('root.server', { message: rootMessage });
      return;
    }
    case 'BadRequestException':
    case 'AuthenticationException':
    case 'NotFoundException':
    case 'TokenMismatchException':
    case 'NetworkError':
    case 'SchemaMismatch':
    case 'UnknownError':
      setError('root.server', { message: GENERIC_ERROR });
      return;
    default:
      info satisfies never;
  }
}

function toSafeRedirect(redirect: string | undefined): string | undefined {
  if (redirect === undefined) return undefined;
  try {
    const target = new URL(redirect, window.location.origin);
    if (target.origin !== window.location.origin) return undefined;
    return target.pathname + target.search + target.hash;
  } catch {
    return undefined;
  }
}

export function LoginPage() {
  const search = useSearch({ from: '/login' });
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((input) => {
    login.mutate(input, {
      onSuccess: () => {
        const href = toSafeRedirect(search.redirect);
        void (href === undefined
          ? navigate({ to: '/webhooks', replace: true })
          : navigate({ href, replace: true }));
      },
      onError: (error) => {
        applyServerError(error, setError);
      },
    });
  });

  const rootError = errors.root?.server?.message;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Smart Sender</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" noValidate onSubmit={(event) => void onSubmit(event)}>
            {search.reason === 'expired' && (
              <Alert>
                <AlertDescription>Your session has expired. Please sign in again.</AlertDescription>
              </Alert>
            )}
            {rootError !== undefined && (
              <Alert variant="destructive">
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email !== undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password !== undefined}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={login.isPending}>
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
