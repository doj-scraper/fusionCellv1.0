import { supabase } from '@/integrations/supabase/client';
import type { ProductPayload } from '@/lib/admin-api';

export interface ProductListResponse {
  products: (ProductPayload & { id: string; created_at: string; updated_at: string })[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function adminProductsList(params: { 
  search?: string; 
  page?: number; 
  per_page?: number;
  sort_by?: string;
  sort_asc?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.per_page) query.set('per_page', String(params.per_page));
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_asc !== undefined) query.set('sort_asc', String(params.sort_asc));

  const { data, error } = await supabase.functions.invoke(`admin-products-list?${query.toString()}`, {
    method: 'GET',
  });
  if (error) throw error;
  if (data?.error) throw data;
  return data as ProductListResponse;
}
