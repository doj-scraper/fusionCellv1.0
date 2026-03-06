
-- create_order_atomic RPC
create or replace function public.create_order_atomic(
  p_user_id uuid,
  p_order_number text,
  p_subtotal numeric,
  p_shipping_cost numeric,
  p_total numeric,
  p_shipping_address_id uuid,
  p_notes text,
  p_line_items jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_price numeric;
  v_current_stock integer;
  v_sku text;
  v_name text;
begin
  if not exists (
    select 1 from public.addresses a
    where a.id = p_shipping_address_id and a.user_id = p_user_id
  ) then
    raise exception 'address ownership violation';
  end if;

  insert into public.orders (
    user_id, order_number, status,
    subtotal, shipping_cost, total,
    shipping_address_id, notes
  ) values (
    p_user_id, p_order_number, 'pending',
    p_subtotal, p_shipping_cost, p_total,
    p_shipping_address_id, p_notes
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    v_price := (v_item->>'price_at_purchase')::numeric;

    select p.stock_quantity, p.sku, p.name
    into v_current_stock, v_sku, v_name
    from public.products p
    where p.id = v_product_id and p.is_active = true
    for update;

    if v_current_stock is null then
      raise exception 'product not found or inactive';
    end if;

    if v_current_stock < v_qty then
      raise exception 'insufficient stock';
    end if;

    update public.products
    set stock_quantity = stock_quantity - v_qty, updated_at = now()
    where id = v_product_id;

    insert into public.order_items (
      order_id, product_id, sku, product_name,
      quantity, price_at_purchase, line_total
    ) values (
      v_order_id, v_product_id, v_sku, v_name,
      v_qty, v_price, round(v_price * v_qty, 2)
    );
  end loop;

  delete from public.cart_items c where c.user_id = p_user_id;

  return jsonb_build_object('order_id', v_order_id);
end;
$$;

revoke all on function public.create_order_atomic(
  uuid, text, numeric, numeric, numeric, uuid, text, jsonb
) from public;

-- Inventory Movement Type Enum
CREATE TYPE inventory_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'return');

-- Inventory Movements Table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  type inventory_movement_type NOT NULL,
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Admin can read inventory movements (via service role); authenticated users can read their own
CREATE POLICY "Authenticated users can read inventory movements"
  ON public.inventory_movements FOR SELECT
  TO authenticated
  USING (true);

-- Trigger Function to auto-log inventory movements
CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_movement_type inventory_movement_type;
  v_reason text;
  v_user_id uuid;
BEGIN
  IF (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity) THEN
    v_movement_type := coalesce(
      current_setting('app.inventory_movement_type', true)::inventory_movement_type,
      CASE WHEN NEW.stock_quantity < OLD.stock_quantity THEN
        'sale'::inventory_movement_type ELSE 'purchase'::inventory_movement_type END
    );
    v_reason := current_setting('app.inventory_adjustment_reason', true);
    v_user_id := auth.uid();

    INSERT INTO public.inventory_movements (
      product_id, user_id, type, quantity,
      previous_stock, new_stock, reason
    ) VALUES (
      NEW.id, v_user_id, v_movement_type,
      (NEW.stock_quantity - OLD.stock_quantity),
      OLD.stock_quantity, NEW.stock_quantity, v_reason
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER trigger_log_inventory_movement
  AFTER UPDATE OF stock_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_movement();

-- get_tiered_price function (Phase 2 readiness)
CREATE OR REPLACE FUNCTION public.get_tiered_price(p_product_id uuid, p_quantity integer)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (SELECT pt.price FROM public.price_tiers pt
     WHERE pt.product_id = p_product_id
     AND pt.min_quantity <= p_quantity
     ORDER BY pt.min_quantity DESC
     LIMIT 1),
    (SELECT p.price FROM public.products p WHERE p.id = p_product_id)
  );
$$;
