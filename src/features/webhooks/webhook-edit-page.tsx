import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useRouteContext, useSearch } from '@tanstack/react-router';
import { isApiError } from '@/api/api-error';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ListSearch } from './list-search';
import { WebhookEditForm } from './webhook-edit-form';
import { webhookDetailQueryOptions } from './webhook-queries';

const LINK_CLASS = 'text-sm text-primary underline-offset-4 hover:underline';

export function WebhookEditPage() {
  const { webhookId } = useParams({ from: '/_protected/webhooks/$webhookId' });
  const { page, search } = useSearch({ from: '/_protected/webhooks/$webhookId' });
  const listSearch = { page, search };

  return (
    <section className="grid max-w-xl gap-4">
      <Link to="/webhooks" search={listSearch} className={LINK_CLASS}>
        ← Back to list
      </Link>
      {webhookId === undefined ? (
        <WebhookNotFound listSearch={listSearch} />
      ) : (
        <WebhookEditContent key={webhookId} id={webhookId} listSearch={listSearch} />
      )}
    </section>
  );
}

interface WebhookEditContentProps {
  id: number;
  listSearch: ListSearch;
}

function WebhookEditContent({ id, listSearch }: WebhookEditContentProps) {
  const { api } = useRouteContext({ from: '__root__' });
  const detail = useQuery(webhookDetailQueryOptions(api, id));

  if (detail.isPending) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Loading webhook">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (detail.isError) {
    if (isApiError(detail.error) && detail.error.info.type === 'NotFoundException') {
      return <WebhookNotFound listSearch={listSearch} />;
    }
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the webhook</AlertTitle>
        <AlertDescription>
          <p>{detail.error.message}</p>
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
        </AlertDescription>
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
        <WebhookEditForm webhook={webhook} listSearch={listSearch} />
      </CardContent>
    </Card>
  );
}

function WebhookNotFound({ listSearch }: { listSearch: ListSearch }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border p-8 text-center">
      <h1 className="font-heading text-xl font-semibold">Webhook not found</h1>
      <Link to="/webhooks" search={listSearch} className={LINK_CLASS}>
        Back to webhooks
      </Link>
    </div>
  );
}
