import { useQuery } from '@tanstack/react-query';
import { Link, useRouteContext, useSearch } from '@tanstack/react-router';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { LINK_CLASS } from './link-class';
import { webhookListQueryOptions } from './webhook-queries';
import { WebhookSearchInput } from './webhook-search-input';
import { WebhooksPagination } from './webhooks-pagination';
import { WebhooksTable } from './webhooks-table';

const SKELETON_ROWS = 10;

export function WebhooksPage() {
  const { api } = useRouteContext({ from: '__root__' });
  const listSearch = useSearch({ from: '/_protected/webhooks' });
  const { page } = listSearch;
  const list = useQuery(webhookListQueryOptions(api, listSearch));

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Webhooks</h1>
        {list.isPlaceholderData && (
          <span role="status" className="text-sm text-muted-foreground">
            Updating…
          </span>
        )}
      </div>
      <WebhookSearchInput />
      {list.isPending ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading webhooks">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load webhooks</AlertTitle>
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              disabled={list.isFetching}
              onClick={() => {
                void list.refetch();
              }}
            >
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : list.data.data.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            {list.data.paging.results.total > 0
              ? `Page ${String(page)} does not exist`
              : 'Nothing found'}
          </p>
          {page > 1 && (
            <Link from="/webhooks" search={(prev) => ({ ...prev, page: 1 })} className={LINK_CLASS}>
              Go to first page
            </Link>
          )}
        </div>
      ) : (
        <>
          <WebhooksTable webhooks={list.data.data} isUpdating={list.isPlaceholderData} />
          <WebhooksPagination current={page} last={list.data.paging.pages.last} />
        </>
      )}
    </section>
  );
}
