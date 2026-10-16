import { Link } from '@tanstack/react-router';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/shared/ui/pagination';

type PageSlot = number | 'gap-start' | 'gap-end';

function pageSlots(current: number, last: number): PageSlot[] {
  const isAnchor = (page: number) => page === 1 || page === last || Math.abs(page - current) <= 1;
  const slots: PageSlot[] = [];
  for (let page = 1; page <= last; page++) {
    if (isAnchor(page) || (isAnchor(page - 1) && isAnchor(page + 1))) {
      slots.push(page);
    } else if (page < current && slots.at(-1) !== 'gap-start') {
      slots.push('gap-start');
    } else if (page > current && slots.at(-1) !== 'gap-end') {
      slots.push('gap-end');
    }
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
          <StepLink page={current - 1} last={last} label="Previous">
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
          </StepLink>
        </PaginationItem>
        {pageSlots(current, last).map((slot) =>
          typeof slot === 'number' ? (
            <PaginationItem key={slot}>
              <Button asChild variant={slot === current ? 'outline' : 'ghost'} size="icon">
                <Link
                  from="/webhooks"
                  search={(prev) => ({ ...prev, page: slot })}
                  activeOptions={{ exact: true }}
                >
                  {slot}
                </Link>
              </Button>
            </PaginationItem>
          ) : (
            <PaginationItem key={slot}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <StepLink page={current + 1} last={last} label="Next">
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon data-icon="inline-end" />
          </StepLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

interface StepLinkProps {
  page: number;
  last: number;
  label: string;
  children: ReactNode;
}

function StepLink({ page, last, label, children }: StepLinkProps) {
  if (page < 1 || page > last) {
    return (
      <Button variant="ghost" disabled aria-label={`${label} page`}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost">
      <Link from="/webhooks" search={(prev) => ({ ...prev, page })} aria-label={`${label} page`}>
        {children}
      </Link>
    </Button>
  );
}
