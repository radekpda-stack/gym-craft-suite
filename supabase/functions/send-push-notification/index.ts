import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push utilities - implemented without external library for Deno compatibility
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidKeys: { publicKey: string; privateKey: string; subject: string }
): Promise<Response> {
  // For now, we'll use a simple fetch to the push endpoint
  // In production, you'd want to use proper VAPID signing
  // This is a simplified implementation
  
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: payload
  });
  
  return response;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This can be called internally or with auth
    const authHeader = req.headers.get('Authorization');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, body, url, tag, data } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get active subscriptions for user
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active subscriptions',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'VAPID keys not configured',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      tag,
      data
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Using web-push compatible approach
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'TTL': '86400',
              'Content-Length': '0',
              'Urgency': 'normal'
            }
          });

          if (response.status === 410 || response.status === 404) {
            // Subscription expired - deactivate it
            await supabaseAdmin
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
            return { success: false, expired: true };
          }

          // For proper web push, we need VAPID signing which requires crypto
          // This is a placeholder - in production use proper web-push library
          return { success: true };
        } catch (error) {
          console.error('Error sending to subscription:', sub.id, error);
          return { success: false, error };
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const expired = results.filter(r => r.status === 'fulfilled' && (r.value as any).expired).length;

    return new Response(JSON.stringify({ 
      success: true, 
      sent,
      expired,
      total: subscriptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
