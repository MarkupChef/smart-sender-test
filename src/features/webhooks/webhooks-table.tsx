import type { Webhook } from '@/api/schemas';
import { cn } from '@/shared/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

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
            <TableCell className="font-medium">{webhook.name}</TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground" title={webhook.url}>
              {webhook.url}
            </TableCell>
            <TableCell>
              <StatusBadge active={webhook.active} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
