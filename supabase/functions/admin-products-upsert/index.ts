import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verify caller is authenticated
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

    // Use service role for writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { product } = await req.json()
    const { id, sku, name, price, moq, stock_quantity, is_active } = product

    // Validation
    if (!sku || !name) throw new Error("VALIDATION_ERROR: SKU and name are required")
    if (price < 0) throw new Error("VALIDATION_ERROR: Price cannot be negative")
    if (moq < 1) throw new Error("VALIDATION_ERROR: MOQ must be at least 1")
    if (stock_quantity < 0) throw new Error("VALIDATION_ERROR: Stock cannot be negative")

    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert({
        ...(id ? { id } : {}),
        sku,
        name,
        price,
        moq,
        stock_quantity,
        is_active: is_active ?? true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error("SKU_CONFLICT: This SKU is already in use")
      throw error
    }

    return new Response(JSON.stringify({ product: data }), {
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
