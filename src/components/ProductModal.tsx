import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { adminProductsUpsert, getAdminErrorMessage, type ProductPayload } from '@/lib/admin-api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: (ProductPayload & { id: string }) | null;
  onSuccess: () => void;
}

const emptyProduct: ProductPayload = { sku: '', name: '', price: 0, moq: 1, stock_quantity: 0, is_active: true };

export function ProductModal({ open, onOpenChange, product, onSuccess }: Props) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState<ProductPayload>(product ? { ...product } : { ...emptyProduct });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpen = (o: boolean) => {
    if (o && !isEdit) setForm({ ...emptyProduct });
    if (o && product) setForm({ ...product });
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminProductsUpsert({ ...form, ...(isEdit ? { id: product!.id } : {}) });
      toast({ title: isEdit ? 'Product updated' : 'Product created' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: getAdminErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moq">MOQ</Label>
              <Input id="moq" type="number" min="1" value={form.moq} onChange={(e) => setForm({ ...form, moq: parseInt(e.target.value) || 1 })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input id="stock" type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
