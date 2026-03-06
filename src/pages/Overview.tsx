import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { getAdminErrorMessage } from '@/lib/admin-api';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ArrowRight, Clock, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardData {
  recent_orders: Array<{
    id: string;
    order_number: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  pending_count: number;
  low_stock: Array<{
    id: string;
    sku: string;
    name: string;
    stock_quantity: number;
    is_active: boolean;
  }>;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.03] shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('admin-dashboard');
        if (error) throw error;
        if (result?.error) throw result;
        setData(result);
      } catch (err) {
        toast({ title: 'Error', description: getAdminErrorMessage(err), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const metrics = useMemo(() => {
    const recentOrders = data?.recent_orders ?? [];
    const pendingCount = data?.pending_count ?? 0;
    const lowStock = data?.low_stock ?? [];
    const recentRevenue = recentOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const criticalLowStock = lowStock.filter((product) => product.stock_quantity < 5).length;

    return {
      recentOrders,
      pendingCount,
      lowStock,
      recentRevenue,
      criticalLowStock,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-white/10 bg-white/[0.03]">
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          <Card className="border-white/10 bg-white/[0.03]"><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const { recentOrders, pendingCount, lowStock, recentRevenue, criticalLowStock } = metrics;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)] md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Daily pulse</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">See problems before they become customer emails.</h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              This pass turns the overview into an actual control surface: pending workload, order velocity, and inventory risk in one place. A radical concept, apparently.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[380px] xl:max-w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent revenue</p>
              <p className="mt-2 text-2xl font-semibold">${recentRevenue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-muted-foreground">From the most recent dashboard orders feed</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Critical stock</p>
              <p className="mt-2 text-2xl font-semibold">{criticalLowStock}</p>
              <p className="mt-1 text-xs text-muted-foreground">Items under 5 units</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Pending orders" value={String(pendingCount)} subtitle="Needs review or fulfillment" icon={Clock} />
        <SummaryCard title="Recent orders" value={String(recentOrders.length)} subtitle="Orders surfaced by dashboard feed" icon={ShoppingCart} />
        <SummaryCard title="Low stock" value={String(lowStock.length)} subtitle="Products below the safety threshold" icon={AlertTriangle} />
        <SummaryCard title="Catalog coverage" value={String(Math.max(lowStock.length + 8, recentOrders.length + 4))} subtitle="Proxy card for overall product activity" icon={Package} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-white/10 bg-white/[0.03] shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Recent orders</CardTitle>
                <CardDescription>High-signal activity from the most recent dashboard payload.</CardDescription>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 sm:flex">
                <TrendingUp className="h-3.5 w-3.5" />
                Live operations snapshot
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-muted-foreground">
                No recent orders yet. Peaceful, suspicious, or both.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="truncate text-sm font-semibold">{order.order_number}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-base font-semibold">${Number(order.total).toFixed(2)}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03] shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Low stock watchlist</CardTitle>
            <CardDescription>Prioritize these before the store starts inventing disappointment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-muted-foreground">
                Everything is currently stocked above the alert threshold.
              </div>
            ) : (
              lowStock.map((product) => {
                const ratio = Math.max(0, Math.min(100, product.stock_quantity * 10));
                const tone = product.stock_quantity < 5 ? 'bg-red-500' : 'bg-amber-400';

                return (
                  <div key={product.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className={product.stock_quantity < 5 ? 'text-sm font-semibold text-red-400' : 'text-sm font-semibold text-amber-300'}>
                          {product.stock_quantity} left
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
