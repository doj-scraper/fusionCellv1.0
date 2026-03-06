
ALTER FUNCTION public.create_order_atomic(uuid, text, numeric, numeric, numeric, uuid, text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.log_inventory_movement()
  SET search_path = public;

ALTER FUNCTION public.get_tiered_price(uuid, integer)
  SET search_path = public;
