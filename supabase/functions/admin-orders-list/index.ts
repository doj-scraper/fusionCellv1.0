import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const VALID_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'cancelled', 'refunded']

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
    const status = url.searchParams.get('status') || ''
    const startDate = url.searchParams.get('start_date') || ''
    const endDate = url.searchParams.get('end_date') || ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '25')))
    const offset = (page - 1) * perPage

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, 
        order_number, 
        status, 
        total, 
        created_at, 
        updated_at,
        shipping_address:addresses!orders_shipping_address_id_fkey(city, state)
      `, { count: 'exact' })

    // Filter by status
    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status)
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      // Add a day to end date to include the full end day
      const endDateTime = new Date(endDate)
      endDateTime.setDate(endDateTime.getDate() + 1)
      query = query.lt('created_at', endDateTime.toISOString().split('T')[0])
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) throw error

    return new Response(JSON.stringify({
      orders: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
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
