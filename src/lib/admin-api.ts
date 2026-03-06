import { supabase } from '@/integrations/supabase/client';

// Standard error shape from edge functions
export interface AdminApiError {
  error: {
    code: string;
    message: string;
  };
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface ProductPayload {
  id?: string;
  sku: string;
  name: string;
  price: number;
  moq: number;
  stock_quantity: number;
  is_active: boolean;
}

export async function adminProductsUpsert(product: ProductPayload) {
  const { data, error } = await supabase.functions.invoke('admin-products-upsert', {
    body: { product },
  });
  if (error) throw error;
  if (data?.error) throw data;
  return data.product;
}

export async function adminProductsSetActive(product_id: string, is_active: boolean) {
  const { data, error } = await supabase.functions.invoke('admin-products-set-active', {
    body: { product_id, is_active },
  });
  if (error) throw error;
  if (data?.error) throw data;
  return data.product;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryAdjustPayload {
  product_id: string;
  delta: number;
  reason?: string;
  note?: string;
}

export async function adminInventoryAdjust(payload: InventoryAdjustPayload) {
  const { data, error } = await supabase.functions.invoke('admin-inventory-adjust', {
    body: payload,
  });
  if (error) throw error;
  if (data?.error) throw data;
  return data.inventory;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'cancelled', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export async function adminOrderSetStatus(order_id: string, status: OrderStatus) {
  const { data, error } = await supabase.functions.invoke('admin-order-set-status', {
    body: { order_id, status },
  });
  if (error) throw error;
  if (data?.error) throw data;
  return data.order;
}

// ─── Helper: extract error message from standard shape ───────────────────────

export function getAdminErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const apiErr = err as AdminApiError;
    return apiErr.error.message || apiErr.error.code || 'Unknown error';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
