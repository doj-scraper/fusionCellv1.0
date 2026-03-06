import { useCallback, useEffect, useState } from 'react';
import { adminProductsList } from '@/lib/admin-products-api';
import { adminInventoryAdjust, getAdminErrorMessage, type ProductPayload } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, ChevronLeft, ChevronRight, Plus, Minus, Package } from 'lucide-react';
import { toRelativeTime } from '@/lib/time';

interface Product extends ProductPayload {
  id: string;
  created_at: string;
  updated_at: string;
}

function getStockHealth(quantity: number) {
  if (quantity <= 10) return { label: 'Low', color: 'text-red-400', bar: 'bg-red-500', value: 20 };
  if (quantity <= 25) return { label: 'Watch', color: 'text-amber-300', bar: 'bg-amber-400', value: 55 };
  return { label: 'Healthy', color: 'text-emerald-300', bar: 'bg-emerald-500', value: 100 };
}

export default function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingAdjustId, setPendingAdjustId] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminProductsList({ search, page, per_page: 50, sort_by: 'stock_quantity', sort_asc: true });
      setProducts(result.products as Product[]);
      setTotalPages(result.total_pages);
      setTotal(result.total);
    } catch (err) {
      toast({ title: 'Error', description: getAdminErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const adjustStockInline = async (product: Product, delta: number) => {
    if (delta === 0 || pendingAdjustId) return;
    setPendingAdjustId(product.id);
    try {
      await adminInventoryAdjust({ product_id: product.id, delta, reason: 'Inline inventory adjustment' });
      toast({ title: 'Stock changed', description: `${product.sku}: ${delta > 0 ? '+' : ''}${delta}` });
      fetchProducts();
    } catch (err) {
      toast({ title: 'Error adjusting stock', description: getAdminErrorMessage(err), variant: 'destructive' });
    } finally {
      setPendingAdjustId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Inline stock editing + risk visualization for fast corrections.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by SKU or name..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center"><Package className="mb-4 h-12 w-12 text-muted-foreground/50" /><p className="text-muted-foreground">No products found.</p></div>
      ) : isMobile ? (
        <div className="space-y-3">
          {products.map((p) => {
            const health = getStockHealth(p.stock_quantity);
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => adjustStockInline(p, -1)} disabled={pendingAdjustId === p.id || p.stock_quantity <= 0}><Minus className="h-4 w-4" /></Button>
                    <span className="w-12 text-center font-mono">{p.stock_quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => adjustStockInline(p, 1)} disabled={pendingAdjustId === p.id}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-3"><Progress value={health.value} className="h-2" /></div>
                  <p className={`mt-1 text-xs ${health.color}`}>{health.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Stock health</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const health = getStockHealth(p.stock_quantity);
                return (
                  <TableRow key={p.id} className="group transition-colors hover:bg-white/[0.03]">
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{p.name}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustStockInline(p, -1)} disabled={pendingAdjustId === p.id || p.stock_quantity <= 0}><Minus className="h-3.5 w-3.5" /></Button>
                        <span className="min-w-9 text-center font-mono text-sm">{p.stock_quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustStockInline(p, 1)} disabled={pendingAdjustId === p.id}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-44">
                        <Progress value={health.value} className="h-2" />
                        <p className={`mt-1 text-xs ${health.color}`}>{health.label}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{toRelativeTime(p.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100" onClick={() => adjustStockInline(p, 5)}>
                        +5
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">{total} products</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
