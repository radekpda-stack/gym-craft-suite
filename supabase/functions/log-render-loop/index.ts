import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RenderLoopLog {
  component: string;
  renderCount: number;
  timestamp: string;
  stackTrace?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const log: RenderLoopLog = await req.json();
    
    // Log to console (will appear in edge function logs)
    console.error('🔴 RENDER LOOP DETECTED:', JSON.stringify({
      component: log.component,
      renderCount: log.renderCount,
      timestamp: log.timestamp,
      userAgent: req.headers.get('user-agent'),
      // Truncate stack trace for readability
      stackTrace: log.stackTrace?.split('\n').slice(0, 10).join('\n'),
    }, null, 2));

    // Optionally store in database for later analysis
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log to audit_log table for persistence
    await supabase.from('audit_log').insert({
      action: 'render_loop_detected',
      table_name: 'frontend',
      record_id: log.component,
      new_data: {
        component: log.component,
        renderCount: log.renderCount,
        timestamp: log.timestamp,
        userAgent: req.headers.get('user-agent'),
        stackTrace: log.stackTrace?.substring(0, 2000), // Limit size
      },
    });

    return new Response(
      JSON.stringify({ success: true, logged: log.component }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error logging render loop:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to log render loop' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
