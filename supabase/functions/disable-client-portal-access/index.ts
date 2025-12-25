import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get trainer from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Chybí autorizace' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: trainer }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !trainer) {
      return new Response(
        JSON.stringify({ error: 'Neplatná autorizace' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { client_id, disabled } = await req.json();
    
    if (!client_id || typeof disabled !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Chybí client_id nebo disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify trainer owns this client
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, user_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Klient nenalezen' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (client.user_id !== trainer.id) {
      return new Response(
        JSON.stringify({ error: 'Nemáte oprávnění k tomuto klientovi' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('client_accounts')
      .select('id, auth_user_id')
      .eq('client_id', client_id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Klient nemá přístup do portálu' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newStatus = disabled ? 'disabled' : 'active';

    // Update status
    const { error: updateError } = await supabaseAdmin
      .from('client_accounts')
      .update({ 
        status: newStatus,
        is_active: !disabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Nepodařilo se změnit stav přístupu' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      trainer_id: trainer.id,
      client_id: client_id,
      auth_user_id: account.auth_user_id,
      action: disabled ? 'disable_access' : 'enable_access',
      metadata: { client_name: client.name },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    console.log(`Portal access ${disabled ? 'disabled' : 'enabled'} for client ${client_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Neočekávaná chyba serveru' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
