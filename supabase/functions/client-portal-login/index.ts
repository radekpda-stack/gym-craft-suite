import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Client for regular auth operations
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { loginIdentifier, password } = await req.json();
    
    if (!loginIdentifier || !password) {
      return new Response(
        JSON.stringify({ error: 'Zadejte přihlašovací jméno a heslo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // First, find the client account by login_identifier to get the auth email
    const { data: clientAccountByLogin, error: lookupError } = await supabaseAdmin
      .from('client_accounts')
      .select('id, client_id, trainer_id, status, auth_user_id, login_identifier')
      .eq('login_identifier', loginIdentifier.toLowerCase())
      .eq('is_active', true)
      .single();

    if (lookupError || !clientAccountByLogin) {
      console.log('No client account found for login_identifier:', loginIdentifier);
      
      // Log failed attempt with login identifier
      await supabaseAdmin.from('login_attempts').insert({
        email: loginIdentifier.toLowerCase(),
        ip_address: ipAddress,
        success: false,
      });
      
      return new Response(
        JSON.stringify({ error: 'Neplatné přihlašovací údaje' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the auth user's email
    if (!clientAccountByLogin.auth_user_id) {
      console.log('Client account has no auth_user_id:', clientAccountByLogin.id);
      return new Response(
        JSON.stringify({ error: 'Účet není správně nastaven. Kontaktujte trenéra.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get email from auth.users
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(
      clientAccountByLogin.auth_user_id
    );

    if (authUserError || !authUserData.user?.email) {
      console.log('Could not find auth user:', clientAccountByLogin.auth_user_id);
      return new Response(
        JSON.stringify({ error: 'Účet není správně nastaven. Kontaktujte trenéra.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authEmail = authUserData.user.email;

    // Check rate limiting using login identifier
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { data: recentAttempts, error: attemptsError } = await supabaseAdmin
      .from('login_attempts')
      .select('id, created_at, success')
      .eq('email', loginIdentifier.toLowerCase())
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('Rate limit check error:', attemptsError);
    }

    // Count failed attempts
    const failedAttempts = (recentAttempts || []).filter(a => !a.success).length;

    if (failedAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      // Check if still in lockout period
      const lastFailedAttempt = recentAttempts?.find(a => !a.success);
      if (lastFailedAttempt) {
        const lockoutEnd = new Date(new Date(lastFailedAttempt.created_at).getTime() + LOCKOUT_MINUTES * 60 * 1000);
        const now = new Date();
        
        if (now < lockoutEnd) {
          const remainingMinutes = Math.ceil((lockoutEnd.getTime() - now.getTime()) / (60 * 1000));
          
          return new Response(
            JSON.stringify({ 
              error: `Příliš mnoho neúspěšných pokusů. Zkuste to znovu za ${remainingMinutes} minut.`,
              code: 'RATE_LIMITED',
              retryAfterMinutes: remainingMinutes
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Attempt login with the actual auth email
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    // Log the attempt
    await supabaseAdmin.from('login_attempts').insert({
      email: loginIdentifier.toLowerCase(),
      ip_address: ipAddress,
      success: !authError,
    });

    if (authError) {
      console.log('Login failed for:', loginIdentifier);
      
      // Log audit event for failed login
      await supabaseAdmin.from('audit_events').insert({
        auth_user_id: null,
        action: 'login_failed',
        metadata: { login_identifier: loginIdentifier.toLowerCase(), reason: authError.message },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return new Response(
        JSON.stringify({ error: 'Neplatné přihlašovací údaje' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = authData.user;

    // Use the already fetched client account
    const clientAccount = clientAccountByLogin;

    if (clientAccount.status === 'disabled') {
      console.log('Disabled account attempt:', user.id);
      
      // Sign out the user since their access is disabled
      await supabaseClient.auth.signOut();
      
      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        trainer_id: clientAccount.trainer_id,
        client_id: clientAccount.client_id,
        auth_user_id: user.id,
        action: 'login_blocked_disabled',
        metadata: {},
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return new Response(
        JSON.stringify({ 
          error: 'Váš přístup byl deaktivován. Kontaktujte svého trenéra.',
          code: 'ACCOUNT_DISABLED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last login timestamp
    await supabaseAdmin
      .from('client_accounts')
      .update({ 
        last_portal_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', clientAccount.id);

    // Log successful login
    await supabaseAdmin.from('audit_events').insert({
      trainer_id: clientAccount.trainer_id,
      client_id: clientAccount.client_id,
      auth_user_id: user.id,
      action: 'login_success',
      metadata: {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    console.log('Successful login for client:', clientAccount.client_id);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        user: {
          id: user.id,
          email: user.email,
          clientId: clientAccount.client_id,
        }
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
