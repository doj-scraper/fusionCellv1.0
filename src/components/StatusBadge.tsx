import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/admin-api';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pending',    className: 'bg-amber-500/15 text-amber-300 border-amber-400/40' },
  paid:       { label: 'Paid',       className: 'bg-blue-500/15 text-blue-300 border-blue-400/40' },
  processing: { label: 'Processing', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/40' },
  shipped:    { label: 'Shipped',    className: 'bg-violet-500/15 text-violet-300 border-violet-400/40' },
  cancelled:  { label: 'Cancelled',  className: 'bg-red-500/15 text-red-300 border-red-400/40' },
  refunded:   { label: 'Refunded',   className: 'bg-zinc-500/20 text-zinc-200 border-zinc-400/40' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
