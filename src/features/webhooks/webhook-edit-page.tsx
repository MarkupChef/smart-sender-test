import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLoaderData, useRouteContext } from '@tanstack/react-router';
import { isApiError } from '@/api/api-error';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { LINK_CLASS } from './link-class';
import { WebhookEditForm } from './webhook-edit-form';
import { findCachedWebhook, webhookDetailQueryOptions } from './webhook-queries';

export function WebhookEditPage() {
  const { webhookId } = useLoaderData({ from: '/_protected/webhooks/$webhookId' });

  return (
    <section className="grid max-w-xl gap-4">
      <Link from="/webhooks/$webhookId" to="/webhooks" search={true} className={LINK_CLASS}>
        ← Back to list
      </Link>
      {webhookId === undefined ? (
        <WebhookNotFound />
      ) : (
        <WebhookEditContent key={webhookId} id={webhookId} />
      )}
    </section>
  );
}

function WebhookEditContent({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const { api } = useRouteContext({ from: '__root__' });
  const detail = useQuery({
    ...webhookDetailQueryOptions(api, id),
    placeholderData: () => findCachedWebhook(queryClient, id),
  });

  if (detail.isPending) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Loading webhook">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (detail.isError && detail.data === undefined) {
    if (isApiError(detail.error) && detail.error.info.type === 'NotFoundException') {
      return <WebhookNotFound />;
    }
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the webhook</AlertTitle>
        <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        <AlertAction>
          <Button
            variant="outline"
            size="sm"
            disabled={detail.isFetching}
            onClick={() => {
              void detail.refetch();
            }}
          >
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const webhook = detail.data;

  return (
    <Card>
      <CardHeader>
        <h1 className="font-heading text-2xl font-semibold">Edit webhook</h1>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid gap-1">
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd>{webhook.active ? 'Active' : 'Inactive'}</dd>
        </dl>
        <WebhookEditForm webhook={webhook} disabled={detail.isPlaceholderData} />
      </CardContent>
    </Card>
  );
}

function WebhookNotFound() {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border p-8 text-center">
      <h1 className="font-heading text-xl font-semibold">Webhook not found</h1>
      <Link from="/webhooks/$webhookId" to="/webhooks" search={true} className={LINK_CLASS}>
        Back to webhooks
      </Link>
    </div>
  );
}
