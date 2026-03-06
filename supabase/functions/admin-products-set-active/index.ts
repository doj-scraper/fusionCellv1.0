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

    const { product_id, is_active } = await req.json()

    if (!product_id) throw new Error("VALIDATION_ERROR: product_id is required")
    if (typeof is_active !== 'boolean') throw new Error("VALIDATION_ERROR: is_active must be a boolean")

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', product_id)
      .select('id, is_active, updated_at')
      .single()

    if (error) throw error
    if (!data) throw new Error("NOT_FOUND: Product not found")

    return new Response(JSON.stringify({ product: data }), {
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
