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

    const { client_id, new_email, new_password, new_login_identifier } = await req.json();
    
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'Chybí client_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!new_email && !new_password && !new_login_identifier) {
      return new Response(
        JSON.stringify({ error: 'Nebyl zadán žádný údaj k aktualizaci' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify trainer owns this client
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, email, name, user_id')
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
    const { data: clientAccount, error: accountError } = await supabaseAdmin
      .from('client_accounts')
      .select('id, auth_user_id, login_identifier')
      .eq('client_id', client_id)
      .maybeSingle();

    if (accountError || !clientAccount) {
      return new Response(
        JSON.stringify({ error: 'Klient nemá přístup do portálu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check login_identifier uniqueness if changing
    if (new_login_identifier && new_login_identifier !== clientAccount.login_identifier) {
      const { data: existingLogin } = await supabaseAdmin
        .from('client_accounts')
        .select('id')
        .ilike('login_identifier', new_login_identifier)
        .neq('id', clientAccount.id)
        .maybeSingle();
      
      if (existingLogin) {
        return new Response(
          JSON.stringify({ error: 'Toto přihlašovací jméno je již obsazeno' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update auth user if needed
    if (clientAccount.auth_user_id && (new_email || new_password)) {
      const authUpdate: { email?: string; password?: string; email_confirm?: boolean } = {};
      if (new_email) {
        authUpdate.email = new_email;
        authUpdate.email_confirm = true;
      }
      if (new_password) {
        authUpdate.password = new_password;
      }

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        clientAccount.auth_user_id,
        authUpdate
      );

      if (updateAuthError) {
        console.error('Auth update error:', updateAuthError);
        
        if (updateAuthError.message?.includes('already been registered') || updateAuthError.message?.includes('email_exists')) {
          return new Response(
            JSON.stringify({ error: 'Tento email je již registrován' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Nepodařilo se aktualizovat přihlašovací údaje' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update client_accounts table
    const accountUpdate: { 
      login_identifier?: string;
      portal_password?: string; 
      last_password_reset_at?: string; 
      updated_at: string 
    } = {
      updated_at: new Date().toISOString()
    };
    
    if (new_login_identifier) {
      accountUpdate.login_identifier = new_login_identifier;
    }
    if (new_password) {
      accountUpdate.portal_password = new_password;
      accountUpdate.last_password_reset_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('client_accounts')
      .update(accountUpdate)
      .eq('id', clientAccount.id);

    // If email changed, update client profile too
    if (new_email) {
      await supabaseAdmin
        .from('clients')
        .update({ email: new_email, updated_at: new Date().toISOString() })
        .eq('id', client_id);
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      trainer_id: trainer.id,
      client_id: client_id,
      auth_user_id: clientAccount.auth_user_id,
      action: 'update_credentials',
      metadata: { 
        client_name: client.name, 
        email_changed: !!new_email,
        password_changed: !!new_password,
        login_identifier_changed: !!new_login_identifier,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
      user_agent: req.headers.get('user-agent'),
    });

    console.log(`Credentials updated for client ${client_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        login_identifier: new_login_identifier || clientAccount.login_identifier,
        email: new_email || client.email,
        password: new_password || null,
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
