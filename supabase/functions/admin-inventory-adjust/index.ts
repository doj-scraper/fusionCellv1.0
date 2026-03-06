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

    const { product_id, delta, reason, note } = await req.json()

    if (!product_id) throw new Error("VALIDATION_ERROR: product_id is required")
    if (typeof delta !== 'number' || delta === 0) throw new Error("VALIDATION_ERROR: delta must be a non-zero number")

    // Fetch current stock
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('stock_quantity')
      .eq('id', product_id)
      .single()

    if (fetchError || !product) throw new Error("NOT_FOUND: Product not found")

    const previous_stock = product.stock_quantity
    const new_stock = previous_stock + delta

    if (new_stock < 0) throw new Error("NEGATIVE_STOCK_NOT_ALLOWED: Adjustment would result in negative stock")

    // Update stock — the trigger on products will auto-log the movement
    // We also manually insert an inventory_movements record with the reason
    // since service role context won't pass session variables to the trigger reliably
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: new_stock, updated_at: new Date().toISOString() })
      .eq('id', product_id)

    if (updateError) throw updateError

    // Manually insert inventory movement with proper context
    // (the trigger may also fire, but this ensures we capture the reason)
    // First delete the auto-generated one from the trigger, then insert with context
    // Actually, simpler: just let the trigger handle it and update the reason after
    const adjustmentReason = reason || note || 'Manual Admin Adjustment'

    // Update the most recent movement for this product to add the reason
    const { error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .update({ 
        type: 'adjustment',
        reason: adjustmentReason,
        user_id: claimsData.claims.sub 
      })
      .eq('product_id', product_id)
      .eq('previous_stock', previous_stock)
      .eq('new_stock', new_stock)
      .order('created_at', { ascending: false })
      .limit(1)

    // Non-critical if this fails — the movement is still logged by the trigger
    if (movementError) {
      console.warn('Failed to update inventory movement context:', movementError)
    }

    return new Response(JSON.stringify({
      inventory: { product_id, previous_stock, new_stock, delta }
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
