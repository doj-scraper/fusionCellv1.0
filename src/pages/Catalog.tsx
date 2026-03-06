import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminProductsSetActive, getAdminErrorMessage, type ProductPayload } from '@/lib/admin-api';
import { adminProductsList } from '@/lib/admin-products-api';
import { ProductModal } from '@/components/ProductModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, ChevronLeft, ChevronRight, Ban } from 'lucide-react';

interface Product extends ProductPayload {
  id: string;
  created_at: string;
  updated_at: string;
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const bulkDisable = async () => {
    try {
      await Promise.all(
        products.filter((product) => selectedIds.includes(product.id)).map((product) => adminProductsSetActive(product.id, false))
      );
      toast({ title: 'Products updated', description: `${selectedIds.length} product(s) disabled` });
      setSelectedIds([]);
      fetchProducts();
    } catch (err) {
      toast({ title: 'Error', description: getAdminErrorMessage(err), variant: 'destructive' });
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminProductsList({ search, page, per_page: 25 });
      setProducts(result.products as Product[]);
      setTotalPages(result.total_pages);
      setTotal(result.total);
    } catch (err) {
      toast({ title: 'Error', description: getAdminErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleToggleActive = async (product: Product) => {
    try {
      await adminProductsSetActive(product.id, !product.is_active);
      toast({ title: `Product ${product.is_active ? 'deactivated' : 'activated'}` });
      fetchProducts();
    } catch (err) {
      toast({ title: 'Error', description: getAdminErrorMessage(err), variant: 'destructive' });
    }
  };

  const openEdit = (p: Product) => { setEditProduct(p); setModalOpen(true); };
  const openCreate = () => { setEditProduct(null); setModalOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Catalog</h1>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && <Button variant="outline" size="sm" onClick={bulkDisable}><Ban className="mr-1 h-4 w-4" />Disable {selectedIds.length}</Button>}
          <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" />New Product</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by SKU or name..."
          className="pl-9"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No products found.</p>
      ) : isMobile ? (
        /* Mobile: card layout */
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id} className="cursor-pointer" onClick={() => openEdit(p)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku}</p>
                  <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                    <span>${Number(p.price).toFixed(2)}</span>
                    <span>·</span>
                    <span>MOQ {p.moq}</span>
                    <span>·</span>
                    <span className={p.stock_quantity < 10 ? 'text-destructive font-medium' : ''}>{p.stock_quantity} in stock</span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch checked={p.is_active} onCheckedChange={() => handleToggleActive(p)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop: table layout */
        <div className="max-h-[70vh] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead><input type="checkbox" aria-label="select all products" checked={selectedIds.length > 0 && selectedIds.length === products.length} onChange={(e) => setSelectedIds(e.target.checked ? products.map((item) => item.id) : [])} /></TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="group hover:bg-white/[0.03]">
                  <TableCell><input type="checkbox" aria-label={`select-${p.sku}`} checked={selectedIds.includes(p.id)} onChange={() => toggleSelected(p.id)} /></TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{p.moq}</TableCell>
                  <TableCell className="text-right">
                    <span className={p.stock_quantity < 10 ? 'text-destructive font-medium' : ''}>{p.stock_quantity}</span>
                  </TableCell>
                  <TableCell>
                    <Switch checked={p.is_active} onCheckedChange={() => handleToggleActive(p)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(p)}>{p.is_active ? "Disable" : "Enable"}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">{total} product{total !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editProduct}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
