import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { loginInputSchema, type LoginInput } from '@/api/schemas';
import { applyServerError } from '@/shared/apply-server-error';
import { InputField } from '../../shared/input-field';
import { ROUTES } from '@/shared/routes';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { useLogin } from './use-login';

const GENERIC_ERROR = 'Sign-in failed. Please try again.';

function isLoginField(field: string): field is keyof LoginInput {
  return loginInputSchema.keyof().safeParse(field).success;
}

export function LoginPage() {
  const search = useSearch({ from: ROUTES.login });
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
        void (search.redirect === undefined
          ? navigate({ to: ROUTES.webhooks, replace: true })
          : navigate({ href: search.redirect, replace: true }));
      },
      onError: (error) => {
        applyServerError(error, setError, isLoginField, GENERIC_ERROR);
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
            <InputField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <InputField
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" disabled={login.isPending}>
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
