import { createLink } from '@tanstack/react-router';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui/pagination';

const PageLink = createLink(PaginationLink);
const PreviousLink = createLink(PaginationPrevious);
const NextLink = createLink(PaginationNext);

const DISABLED_CLASS = 'pointer-events-none opacity-50';

type PageSlot = number | 'gap-start' | 'gap-end';

function pageSlots(current: number, last: number): PageSlot[] {
  const anchors = [...new Set([1, current - 1, current, current + 1, last])]
    .filter((page) => page >= 1 && page <= last)
    .sort((a, b) => a - b);
  const slots: PageSlot[] = [];
  let previous = 0;
  for (const page of anchors) {
    if (page - previous === 2) slots.push(previous + 1);
    else if (page - previous > 2) slots.push(page <= current ? 'gap-start' : 'gap-end');
    slots.push(page);
    previous = page;
  }
  return slots;
}

interface WebhooksPaginationProps {
  current: number;
  last: number;
}

export function WebhooksPagination({ current, last }: WebhooksPaginationProps) {
  if (last <= 1) return undefined;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          {current > 1 ? (
            <PreviousLink
              from="/webhooks"
              search={(prev) => ({ ...prev, page: current - 1 })}
              activeOptions={{ exact: true }}
            />
          ) : (
            <PaginationPrevious aria-disabled className={DISABLED_CLASS} />
          )}
        </PaginationItem>
        {pageSlots(current, last).map((slot) => (
          <PaginationItem key={slot}>
            {typeof slot === 'number' ? (
              <PageLink
                from="/webhooks"
                search={(prev) => ({ ...prev, page: slot })}
                activeOptions={{ exact: true }}
                isActive={slot === current}
              >
                {slot}
              </PageLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          {current < last ? (
            <NextLink
              from="/webhooks"
              search={(prev) => ({ ...prev, page: current + 1 })}
              activeOptions={{ exact: true }}
            />
          ) : (
            <PaginationNext aria-disabled className={DISABLED_CLASS} />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
