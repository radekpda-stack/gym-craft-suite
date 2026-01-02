import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LP Configuration
const LP_CONFIG = {
  POINTS_PER_AMOUNT: 20, // 1 LP per 20 CZK
  MIN_POINTS: 1,
  DAILY_CAP: 50,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id, action = 'sale' } = await req.json();
    console.log(`[calculate-lp] Processing order ${order_id}, action: ${action}`);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .select('*, sales_order_items(*, products(category))')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only process completed orders
    if (order.payment_status !== 'completed' && action === 'sale') {
      console.log(`[calculate-lp] Order ${order_id} not completed, status: ${order.payment_status}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Order not completed yet',
        skipped: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = order.client_id;
    if (!clientId) {
      console.log(`[calculate-lp] Order ${order_id} has no client_id`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No client associated',
        skipped: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle refund/void
    if (action === 'refund' || order.payment_status === 'refunded' || order.payment_status === 'void') {
      // Check if there's an existing LP entry for this order
      const { data: existingLP } = await supabase
        .from('loyalty_ledger')
        .select('id, points')
        .eq('source_id', order_id)
        .eq('source_type', 'sale')
        .single();

      if (existingLP) {
        // Check if already refunded
        const { data: refundEntry } = await supabase
          .from('loyalty_ledger')
          .select('id')
          .eq('source_id', order_id)
          .eq('source_type', 'refund')
          .single();

        if (!refundEntry) {
          // Create refund entry
          await supabase.from('loyalty_ledger').insert({
            client_id: clientId,
            source_type: 'refund',
            source_id: order_id,
            points: -existingLP.points,
            meta: {
              original_points: existingLP.points,
              reason: 'Order refunded/voided',
            },
          });

          // Recalculate balance
          await supabase.rpc('recalculate_loyalty_balance', { p_client_id: clientId });

          console.log(`[calculate-lp] Refunded ${existingLP.points} LP for order ${order_id}`);
          
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'refund',
            points_refunded: existingLP.points,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already refunded or no LP to refund',
        idempotent: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check idempotency for sale
    const { data: existingEntry } = await supabase
      .from('loyalty_ledger')
      .select('id')
      .eq('source_id', order_id)
      .eq('source_type', 'sale')
      .single();

    if (existingEntry) {
      console.log(`[calculate-lp] Order ${order_id} already processed`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already processed',
        idempotent: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate LP
    const totalAmount = order.products_subtotal || order.total_amount;
    let earnedPoints = Math.max(LP_CONFIG.MIN_POINTS, Math.floor(totalAmount / LP_CONFIG.POINTS_PER_AMOUNT));

    // Check daily cap
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayEntries } = await supabase
      .from('loyalty_ledger')
      .select('points')
      .eq('client_id', clientId)
      .eq('source_type', 'sale')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const todayPoints = (todayEntries || []).reduce((sum, e) => sum + e.points, 0);
    const remainingCap = LP_CONFIG.DAILY_CAP - todayPoints;

    if (remainingCap <= 0) {
      console.log(`[calculate-lp] Daily cap reached for client ${clientId}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Daily cap reached',
        points_earned: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    earnedPoints = Math.min(earnedPoints, remainingCap);

    // Collect product categories for badge tracking
    const categories: Record<string, number> = {};
    for (const item of order.sales_order_items || []) {
      const category = item.products?.category || 'other';
      categories[category] = (categories[category] || 0) + item.quantity;
    }

    // Insert LP entry
    const { error: insertError } = await supabase.from('loyalty_ledger').insert({
      client_id: clientId,
      source_type: 'sale',
      source_id: order_id,
      points: earnedPoints,
      meta: {
        total_amount: totalAmount,
        categories,
        capped: earnedPoints < Math.floor(totalAmount / LP_CONFIG.POINTS_PER_AMOUNT),
      },
    });

    if (insertError) {
      console.error('Error inserting LP entry:', insertError);
      throw insertError;
    }

    // Recalculate balance
    await supabase.rpc('recalculate_loyalty_balance', { p_client_id: clientId });

    // Track activity
    await supabase.from('client_portal_activity').insert({
      client_id: clientId,
      activity_type: 'lp_earned',
      activity_date: new Date().toISOString().split('T')[0],
      metadata: {
        points: earnedPoints,
        order_id,
        total_amount: totalAmount,
      },
    });

    // Check shop badges
    await checkShopBadges(supabase as any, clientId, categories);

    console.log(`[calculate-lp] Awarded ${earnedPoints} LP to client ${clientId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      points_earned: earnedPoints,
      categories,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[calculate-lp] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkShopBadges(
  supabase: any,
  clientId: string,
  newCategories: Record<string, number>
) {
  // Get all LP entries to count category purchases
  const { data: allEntries } = await supabase
    .from('loyalty_ledger')
    .select('meta')
    .eq('client_id', clientId)
    .eq('source_type', 'sale');

  const categoryCounts: Record<string, number> = {};
  for (const entry of allEntries || []) {
    const meta = entry.meta as { categories?: Record<string, number> };
    if (meta?.categories) {
      for (const [cat, count] of Object.entries(meta.categories)) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
      }
    }
  }

  // Get shop_category badges
  const { data: shopBadges } = await supabase
    .from('badge_definitions')
    .select('*')
    .eq('rule_type', 'shop_category')
    .eq('is_active', true);

  for (const badge of shopBadges || []) {
    const ruleValue = badge.rule_value as { category: string; count: number };
    const category = ruleValue.category;
    const requiredCount = ruleValue.count;

    if (categoryCounts[category] >= requiredCount) {
      // Check if badge already earned
      const { data: existing } = await supabase
        .from('client_badges')
        .select('id')
        .eq('client_id', clientId)
        .eq('badge_id', badge.id)
        .single();

      if (!existing) {
        // Award badge
        await supabase.from('client_badges').insert({
          client_id: clientId,
          badge_id: badge.id,
          earned_at: new Date().toISOString(),
          progress_current: categoryCounts[category],
          progress_target: requiredCount,
        });

        // Award XP bonus for badge
        if (badge.xp_bonus > 0) {
          await supabase.from('xp_events').insert({
            client_id: clientId,
            source_type: 'badge',
            source_id: badge.id,
            xp_amount: badge.xp_bonus,
            description: `Odznak: ${badge.name}`,
            meta: { badge_name: badge.name, badge_rarity: badge.rarity },
          });

          await supabase.rpc('recalculate_client_xp', { p_client_id: clientId });
        }

        // Track activity
        await supabase.from('client_portal_activity').insert({
          client_id: clientId,
          activity_type: 'badge_earned',
          activity_date: new Date().toISOString().split('T')[0],
          metadata: {
            badge_id: badge.id,
            badge_name: badge.name,
            badge_rarity: badge.rarity,
          },
        });

        console.log(`[calculate-lp] Awarded badge ${badge.id} to client ${clientId}`);
      }
    }
  }

  // Check LP milestone badges
  const { data: balance } = await supabase
    .from('loyalty_balance')
    .select('lifetime_points')
    .eq('client_id', clientId)
    .single();

  if (balance) {
    const { data: lpBadges } = await supabase
      .from('badge_definitions')
      .select('*')
      .eq('rule_type', 'lp_milestone')
      .eq('is_active', true);

    for (const badge of lpBadges || []) {
      const ruleValue = badge.rule_value as { lifetime_points: number };
      if (balance.lifetime_points >= ruleValue.lifetime_points) {
        const { data: existing } = await supabase
          .from('client_badges')
          .select('id')
          .eq('client_id', clientId)
          .eq('badge_id', badge.id)
          .single();

        if (!existing) {
          await supabase.from('client_badges').insert({
            client_id: clientId,
            badge_id: badge.id,
            earned_at: new Date().toISOString(),
            progress_current: balance.lifetime_points,
            progress_target: ruleValue.lifetime_points,
          });

          if (badge.xp_bonus > 0) {
            await supabase.from('xp_events').insert({
              client_id: clientId,
              source_type: 'badge',
              source_id: badge.id,
              xp_amount: badge.xp_bonus,
              description: `Odznak: ${badge.name}`,
              meta: { badge_name: badge.name, badge_rarity: badge.rarity },
            });
            await supabase.rpc('recalculate_client_xp', { p_client_id: clientId });
          }

          await supabase.from('client_portal_activity').insert({
            client_id: clientId,
            activity_type: 'badge_earned',
            activity_date: new Date().toISOString().split('T')[0],
            metadata: { badge_id: badge.id, badge_name: badge.name, badge_rarity: badge.rarity },
          });

          console.log(`[calculate-lp] Awarded LP milestone badge ${badge.id} to client ${clientId}`);
        }
      }
    }
  }
}
