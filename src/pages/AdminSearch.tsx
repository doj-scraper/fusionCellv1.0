import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { adminSearchAll, type AdminSearchResult } from '@/lib/admin-search-api';
import { getAdminErrorMessage } from '@/lib/admin-api';
import { useToast } from '@/hooks/use-toast';

export default function AdminSearch() {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const [results, setResults] = useState<AdminSearchResult>({ orders: [], products: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const run = async () => {
      if (!q) {
        setResults({ orders: [], products: [], customers: [] });
        return;
      }
      setLoading(true);
      try {
        setResults(await adminSearchAll(q));
      } catch (err) {
        toast({ title: 'Search failed', description: getAdminErrorMessage(err), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [q, toast]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm text-muted-foreground">Search query</p>
        <h1 className="mt-1 text-xl font-semibold">{q ? `“${q}”` : 'Start searching orders, products, and customers'}</h1>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !q ? (
        <Card className="border-white/10 bg-white/[0.03]"><CardContent className="flex items-center gap-3 p-8 text-muted-foreground"><Search className="h-5 w-5" />Type in the header search bar and press enter.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader><CardTitle className="text-base">Orders</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {results.orders.length === 0 ? <p className="text-muted-foreground">No order matches.</p> : results.orders.map((order) => (
                <Link key={order.id} to={`/sales/${order.id}`} className="block rounded-lg border border-white/10 p-2 hover:bg-white/5">
                  {order.order_number} — {order.customer_email ?? 'Customer'}
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader><CardTitle className="text-base">Products</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {results.products.length === 0 ? <p className="text-muted-foreground">No product matches.</p> : results.products.map((product) => (
                <div key={product.id} className="rounded-lg border border-white/10 p-2">
                  {product.sku} — {product.name}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader><CardTitle className="text-base">Customers</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {results.customers.length === 0 ? <p className="text-muted-foreground">No customer email in current order result set.</p> : results.customers.map((customer) => (
                <div key={customer.email} className="rounded-lg border border-white/10 p-2">{customer.email}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
