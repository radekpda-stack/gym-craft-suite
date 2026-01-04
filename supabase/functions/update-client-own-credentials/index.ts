import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Chybí autorizace' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their identity
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Nepodařilo se ověřit uživatele' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { newEmail, newPassword } = await req.json();

    // Validate inputs
    if (!newEmail && !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Musíte zadat alespoň nový email nebo heslo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: 'Neplatný formát emailu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword && newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Heslo musí mít alespoň 8 znaků' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get client account for this user
    const { data: clientAccount, error: accountError } = await supabaseAdmin
      .from('client_accounts')
      .select('id, client_id, trainer_id, login_identifier')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (accountError || !clientAccount) {
      console.error('Client account error:', accountError);
      return new Response(
        JSON.stringify({ error: 'Klientský účet nebyl nalezen' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email uniqueness if changing email
    if (newEmail && newEmail !== user.email) {
      // Check in auth.users via admin API
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(
        u => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== user.id
      );
      
      if (emailExists) {
        return new Response(
          JSON.stringify({ error: 'Tento email je již používán jiným účtem' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update auth user
    const updatePayload: { email?: string; password?: string } = {};
    if (newEmail) updatePayload.email = newEmail;
    if (newPassword) updatePayload.password = newPassword;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      updatePayload
    );

    if (updateError) {
      console.error('Auth update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Nepodařilo se aktualizovat přihlašovací údaje' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update client_accounts
    const accountUpdate: Record<string, unknown> = {
      credentials_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    if (newEmail) {
      accountUpdate.login_identifier = newEmail;
    }
    if (newPassword) {
      accountUpdate.portal_password = newPassword;
    }

    const { error: accountUpdateError } = await supabaseAdmin
      .from('client_accounts')
      .update(accountUpdate)
      .eq('id', clientAccount.id);

    if (accountUpdateError) {
      console.error('Account update error:', accountUpdateError);
      // Auth was updated but DB wasn't - log but don't fail
    }

    // Update clients table email if changed
    if (newEmail) {
      const { error: clientUpdateError } = await supabaseAdmin
        .from('clients')
        .update({ email: newEmail, updated_at: new Date().toISOString() })
        .eq('id', clientAccount.client_id);

      if (clientUpdateError) {
        console.error('Client email update error:', clientUpdateError);
      }
    }

    // Get client name for notification
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', clientAccount.client_id)
      .single();

    // Create notification for trainer
    const { error: notifError } = await supabaseAdmin
      .from('client_portal_notifications')
      .insert({
        client_id: clientAccount.client_id,
        type: 'credentials_changed',
        title: 'Klient si změnil přihlašovací údaje',
        message: `${clientData?.name || 'Klient'} si změnil ${newEmail && newPassword ? 'email i heslo' : newEmail ? 'email' : 'heslo'}`,
        metadata: {
          changed_email: !!newEmail,
          changed_password: !!newPassword,
          new_email: newEmail || null,
        }
      });

    if (notifError) {
      console.error('Notification error:', notifError);
    }

    // Delete the credentials_change_required notification for this client (since they changed their credentials)
    const { error: deleteNotifError } = await supabaseAdmin
      .from('client_portal_notifications')
      .delete()
      .eq('client_id', clientAccount.client_id)
      .eq('type', 'credentials_change_required');

    if (deleteNotifError) {
      console.error('Delete notification error:', deleteNotifError);
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      action: 'client_credentials_self_update',
      client_id: clientAccount.client_id,
      trainer_id: clientAccount.trainer_id,
      auth_user_id: user.id,
      metadata: {
        changed_email: !!newEmail,
        changed_password: !!newPassword,
      }
    });

    console.log(`Client ${clientAccount.client_id} updated their credentials`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Přihlašovací údaje byly úspěšně změněny',
        newEmail: newEmail || user.email
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
