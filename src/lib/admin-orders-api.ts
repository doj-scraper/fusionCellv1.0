import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrderListItem {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  customer_email?: string | null;
  shipping_address: {
    city: string;
    state: string;
  } | null;
}

export interface OrdersListResponse {
  orders: OrderListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  customer_email?: string | null;
  shipping_address: {
    id: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  items: OrderItem[];
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function adminOrdersList(params: {
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<OrdersListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  if (params.search) query.set('search', params.search);

  // Query-string invoke is used so filters are respected in edge runtime.
  const { data: result, error: fetchError } = await supabase.functions.invoke(
    `admin-orders-list?${query.toString()}`
  );

  if (fetchError) throw fetchError;
  if (result?.error) throw result;
  return result as OrdersListResponse;
}

export async function adminOrderDetail(orderId: string): Promise<OrderDetail> {
  const { data, error } = await supabase.functions.invoke(
    `admin-order-detail?order_id=${orderId}`
  );

  if (error) throw error;
  if (data?.error) throw data;
  return data.order as OrderDetail;
}
