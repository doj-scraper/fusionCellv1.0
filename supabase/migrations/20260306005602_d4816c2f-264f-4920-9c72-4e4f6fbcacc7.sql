
-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.price_tiers enable row level security;

-- PRODUCTS: anyone authenticated can read active products
create policy "Anyone can read active products"
  on public.products for select
  to authenticated
  using (is_active = true);

-- ADDRESSES: users can CRUD their own addresses
create policy "Users manage own addresses"
  on public.addresses for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- CART ITEMS: users can CRUD their own cart
create policy "Users manage own cart"
  on public.cart_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ORDERS: users can read their own orders
create policy "Users read own orders"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

-- ORDER ITEMS: users can read items from their own orders
create policy "Users read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
      and o.user_id = auth.uid()
    )
  );

-- PRICE TIERS: anyone authenticated can read
create policy "Anyone can read price tiers"
  on public.price_tiers for select
  to authenticated
  using (true);
