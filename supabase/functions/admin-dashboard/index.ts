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

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // Fetch recent orders (last 7 days)
    const { data: recentOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, total, status, created_at')
      .gte('created_at', sevenDaysAgoISO)
      .order('created_at', { ascending: false })
      .limit(20)

    if (ordersError) throw ordersError

    // Count pending orders (all time)
    const { count: pendingCount, error: pendingError } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingError) throw pendingError

    // Low stock products (stock < 10)
    const { data: lowStockProducts, error: stockError } = await supabaseAdmin
      .from('products')
      .select('id, sku, name, stock_quantity, is_active')
      .lt('stock_quantity', 10)
      .order('stock_quantity', { ascending: true })
      .limit(20)

    if (stockError) throw stockError

    return new Response(JSON.stringify({
      recent_orders: recentOrders ?? [],
      pending_count: pendingCount ?? 0,
      low_stock: lowStockProducts ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    const msg = err.message || 'Unknown error'
    const [code, ...rest] = msg.includes(':') ? msg.split(':') : ['INTERNAL_ERROR', msg]
    const message = rest.join(':').trim() || msg
    return new Response(JSON.stringify({ error: { code: code.trim(), message } }), {
      status: code.trim() === 'UNAUTHORIZED' ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
