import { Link } from '@tanstack/react-router';
import type { Webhook } from '@/api/schemas';
import { cn } from '@/shared/cn';
import { ROUTES } from '@/shared/routes';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { WEBHOOK_LINK_CLASS } from '../webhook-link-class';

interface WebhooksTableProps {
  webhooks: Webhook[];
  isUpdating: boolean;
}

export function WebhooksTable({ webhooks, isUpdating }: WebhooksTableProps) {
  return (
    <Table aria-busy={isUpdating} className={cn('transition-opacity', isUpdating && 'opacity-60')}>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {webhooks.map((webhook) => (
          <TableRow key={webhook.id}>
            <TableCell className="font-medium">
              <Link
                from={ROUTES.webhooks}
                to={ROUTES.webhookEdit}
                params={{ webhookId: String(webhook.id) }}
                search={true}
                className={WEBHOOK_LINK_CLASS}
              >
                {webhook.name}
              </Link>
            </TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground" title={webhook.url}>
              {webhook.url}
            </TableCell>
            <TableCell>
              <Badge variant={webhook.active ? 'success' : 'muted'}>
                {webhook.active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
