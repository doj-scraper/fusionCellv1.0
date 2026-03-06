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
    const search = url.searchParams.get('search') || ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '25')))
    const offset = (page - 1) * perPage
    const sortBy = url.searchParams.get('sort_by') || 'updated_at'
    const sortAsc = url.searchParams.get('sort_asc') === 'true'

    // Whitelist allowed sort columns
    const allowedSortColumns = ['updated_at', 'stock_quantity', 'name', 'sku', 'price', 'created_at']
    const finalSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'updated_at'

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .order(finalSortBy, { ascending: sortAsc })
      .range(offset, offset + perPage - 1)

    if (error) throw error

    return new Response(JSON.stringify({
      products: data ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count ?? 0) / perPage),
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
