import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error("UNAUTHORIZED: Missing or invalid authorization header")
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      throw new Error("UNAUTHORIZED: Invalid session")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    if (!orderId) {
      throw new Error("VALIDATION_ERROR: order_id is required")
    }

    // Get order with shipping address
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id, 
        order_number, 
        user_id,
        status, 
        total, 
        created_at, 
        updated_at,
        shipping_address:addresses!orders_shipping_address_id_fkey(
          id,
          line1,
          line2,
          city,
          state,
          postal_code,
          country
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError
    if (!order) throw new Error("NOT_FOUND: Order not found")

    // Get order items with product details
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        product:products(
          id,
          sku,
          name
        )
      `)
      .eq('order_id', orderId)

    if (itemsError) throw itemsError

    return new Response(JSON.stringify({
      order: {
        ...order,
        items: items || []
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    const msg = err.message || 'Unknown error'
    const [code, ...rest] = msg.includes(':') ? msg.split(':') : ['INTERNAL_ERROR', msg]
    const message = rest.join(':').trim() || msg
    return new Response(JSON.stringify({ error: { code: code.trim(), message } }), {
      status: code.trim() === 'UNAUTHORIZED' ? 401 : code.trim() === 'NOT_FOUND' ? 404 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
