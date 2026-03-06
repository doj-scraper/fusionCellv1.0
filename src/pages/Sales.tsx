import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, PackageSearch, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminOrdersList, type OrderListItem } from '@/lib/admin-orders-api';
import { ORDER_STATUSES, getAdminErrorMessage } from '@/lib/admin-api';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const PER_PAGE = 25;

export default function Sales() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await adminOrdersList({
        status: statusFilter === 'all' ? undefined : statusFilter,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        page,
        per_page: PER_PAGE,
      });
      setOrders(result.orders);
      setTotalPages(result.total_pages);
      setTotal(result.total);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error loading orders',
        description: getAdminErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, startDate, endDate]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const pending = orders.filter((order) => order.status === 'pending').length;
    const shipped = orders.filter((order) => order.status === 'shipped').length;
    return { totalValue, pending, shipped };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Filtered orders</p><p className="mt-3 text-3xl font-semibold">{total}</p><p className="mt-2 text-xs text-muted-foreground">Current query result count</p></CardContent></Card>
        <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Visible order value</p><p className="mt-3 text-3xl font-semibold">{formatCurrency(stats.totalValue)}</p><p className="mt-2 text-xs text-muted-foreground">Based on loaded page results</p></CardContent></Card>
        <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Status split</p><p className="mt-3 text-3xl font-semibold">{stats.pending} / {stats.shipped}</p><p className="mt-2 text-xs text-muted-foreground">Pending vs shipped on this page</p></CardContent></Card>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.16)] md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-[170px] rounded-xl border-white/10 bg-black/10">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[150px] justify-start rounded-xl border-white/10 bg-black/10 text-left font-normal', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setPage(1); }} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[150px] justify-start rounded-xl border-white/10 bg-black/10 text-left font-normal', !endDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={(date) => { setEndDate(date); setPage(1); }} initialFocus />
              </PopoverContent>
            </Popover>

            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters} className="h-10 rounded-xl px-3">
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">Click an order row to inspect details and change status.</p>
        </div>

        <div className="mt-5 max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-black/10">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#161618]">
              <TableRow className="hover:bg-transparent">
                <TableHead>Order #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <PackageSearch className="h-8 w-8" />
                      <div>
                        <p className="font-medium text-foreground">No orders found</p>
                        <p className="mt-1 text-sm">Try widening the filters or date range.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="group cursor-pointer border-white/10 transition-colors hover:bg-white/[0.04]" onClick={() => navigate(`/sales/${order.id}`)}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{order.shipping_address ? `${order.shipping_address.city}, ${order.shipping_address.state}` : '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100">Open</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl border-white/10 bg-black/10">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-xl border-white/10 bg-black/10">
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
