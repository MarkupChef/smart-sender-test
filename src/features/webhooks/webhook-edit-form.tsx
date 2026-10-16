import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/api/api-error';
import { webhookInputSchema, type Webhook, type WebhookInput } from '@/api/schemas';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { ListSearch } from './list-search';
import { useUpdateWebhook } from './webhook-queries';

const GENERIC_ERROR = 'Could not save the webhook. Please try again.';

function isWebhookField(field: string): field is keyof WebhookInput {
  return field === 'name' || field === 'url';
}

function applyServerError(error: unknown, setError: UseFormSetError<WebhookInput>): void {
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
        if (isWebhookField(field)) {
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
    case 'AuthenticationException':
      return;
    case 'BadRequestException':
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

interface WebhookEditFormProps {
  webhook: Webhook;
  listSearch: ListSearch;
}

export function WebhookEditForm({ webhook, listSearch }: WebhookEditFormProps) {
  const navigate = useNavigate();
  const update = useUpdateWebhook(webhook.id);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WebhookInput>({
    resolver: zodResolver(webhookInputSchema),
    values: { name: webhook.name, url: webhook.url },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = handleSubmit((input) => {
    update.mutate(input, {
      onSuccess: () => {
        void navigate({ to: '/webhooks', search: listSearch });
      },
      onError: (error) => {
        applyServerError(error, setError);
      },
    });
  });

  const rootError = errors.root?.server?.message;

  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => void onSubmit(event)}>
      {rootError !== undefined && (
        <Alert variant="destructive">
          <AlertDescription>{rootError}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="webhook-name">Name</Label>
        <Input
          id="webhook-name"
          autoComplete="off"
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name ? 'webhook-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="webhook-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="webhook-url">URL</Label>
        <Input
          id="webhook-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          aria-invalid={errors.url !== undefined}
          aria-describedby={errors.url ? 'webhook-url-error' : undefined}
          {...register('url')}
        />
        {errors.url && (
          <p id="webhook-url-error" className="text-sm text-destructive">
            {errors.url.message}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>
          Save
        </Button>
        <Button asChild variant="outline">
          <Link to="/webhooks" search={listSearch}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
