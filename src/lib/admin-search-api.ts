import { adminOrdersList, type OrderListItem } from '@/lib/admin-orders-api';
import { adminProductsList, type ProductListResponse } from '@/lib/admin-products-api';

export interface AdminSearchResult {
  orders: OrderListItem[];
  products: ProductListResponse['products'];
  customers: Array<{ id: string; email: string }>;
}

export async function adminSearchAll(query: string): Promise<AdminSearchResult> {
  if (!query.trim()) {
    return { orders: [], products: [], customers: [] };
  }

  const [ordersResp, productsResp] = await Promise.all([
    adminOrdersList({ search: query, per_page: 8, page: 1 }),
    adminProductsList({ search: query, per_page: 8, page: 1 }),
  ]);

  const customersMap = new Map<string, { id: string; email: string }>();
  for (const order of ordersResp.orders) {
    if (order.customer_email) {
      customersMap.set(order.customer_email, { id: order.id, email: order.customer_email });
    }
  }

  return {
    orders: ordersResp.orders,
    products: productsResp.products,
    customers: Array.from(customersMap.values()),
  };
}
