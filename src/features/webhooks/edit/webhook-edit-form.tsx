import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { isApiError } from '@/api/api-error';
import { webhookInputSchema, type Webhook, type WebhookInput } from '@/api/schemas';
import { applyServerError } from '@/shared/apply-server-error';
import { InputField } from '../../../shared/input-field';
import { ROUTES } from '@/shared/routes';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { useUpdateWebhook } from '../webhook-queries';

const GENERIC_ERROR = 'Could not save the webhook. Please try again.';

function isWebhookField(field: string): field is keyof WebhookInput {
  return webhookInputSchema.keyof().safeParse(field).success;
}

interface WebhookEditFormProps {
  webhook: Webhook;
  disabled: boolean;
}

export function WebhookEditForm({ webhook, disabled }: WebhookEditFormProps) {
  const navigate = useNavigate({ from: ROUTES.webhookEdit });
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
    disabled,
  });

  const onSubmit = handleSubmit((input) => {
    update.mutate(input, {
      onSuccess: () => {
        void navigate({ to: ROUTES.webhooks, search: true });
      },
      onError: (error) => {
        if (isApiError(error) && error.info.type === 'AuthenticationException') return;
        applyServerError(error, setError, isWebhookField, GENERIC_ERROR);
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
      <InputField
        id="webhook-name"
        label="Name"
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />
      <InputField
        id="webhook-url"
        label="URL"
        type="url"
        inputMode="url"
        autoComplete="off"
        error={errors.url?.message}
        {...register('url')}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={disabled || update.isPending}>
          Save
        </Button>
        <Button asChild variant="outline">
          <Link from={ROUTES.webhookEdit} to={ROUTES.webhooks} search={true}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
