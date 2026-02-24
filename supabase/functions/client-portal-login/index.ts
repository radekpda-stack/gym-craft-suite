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

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const rawBody = await req.json();
    const loginIdentifier = (rawBody.loginIdentifier || '').trim();
    const password = (rawBody.password || '').trim();
    
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

    // Find the client account by login_identifier
    const { data: clientAccount, error: lookupError } = await supabaseAdmin
      .from('client_accounts')
      .select('id, client_id, trainer_id, user_id, status, auth_user_id, login_identifier, portal_password')
      .eq('login_identifier', loginIdentifier.toLowerCase())
      .eq('is_active', true)
      .single();

    if (lookupError || !clientAccount) {
      console.log('No client account found for login_identifier:', loginIdentifier);
      
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

    // Check if account is disabled
    if (clientAccount.status === 'disabled') {
      console.log('Disabled account attempt:', clientAccount.id);
      
      await supabaseAdmin.from('audit_events').insert({
        trainer_id: clientAccount.trainer_id,
        client_id: clientAccount.client_id,
        auth_user_id: clientAccount.auth_user_id,
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

    // Check rate limiting
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const { data: recentAttempts } = await supabaseAdmin
      .from('login_attempts')
      .select('id, created_at, success')
      .eq('email', loginIdentifier.toLowerCase())
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false });

    const failedAttempts = (recentAttempts || []).filter(a => !a.success).length;

    if (failedAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
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

    // ===== UNIFIED AUTH: Always end up with Supabase session =====
    
    let authEmail: string;
    let authUserId: string | null = clientAccount.auth_user_id;

    if (authUserId) {
      // Client already has auth user - get their email
      const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(authUserId);

      if (authUserError || !authUserData.user?.email) {
        console.log('Could not find auth user:', authUserId);
        return new Response(
          JSON.stringify({ error: 'Účet není správně nastaven. Kontaktujte trenéra.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authEmail = authUserData.user.email;
      console.log('Using existing auth user:', authUserId);

    } else {
      // No auth user - verify password first, then create auth user
      console.log('No auth_user_id for client:', clientAccount.client_id);

      if (!clientAccount.portal_password) {
        console.log('No portal_password set for account:', clientAccount.id);
        return new Response(
          JSON.stringify({ error: 'Účet není správně nastaven. Kontaktujte trenéra.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password before creating auth user
      if (password !== clientAccount.portal_password) {
        console.log('Password mismatch for:', loginIdentifier);
        
        await supabaseAdmin.from('login_attempts').insert({
          email: loginIdentifier.toLowerCase(),
          ip_address: ipAddress,
          success: false,
        });

        await supabaseAdmin.from('audit_events').insert({
          auth_user_id: null,
          client_id: clientAccount.client_id,
          trainer_id: clientAccount.trainer_id,
          action: 'login_failed',
          metadata: { login_identifier: loginIdentifier.toLowerCase(), reason: 'password_mismatch' },
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return new Response(
          JSON.stringify({ error: 'Neplatné přihlašovací údaje' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Password correct - create Supabase Auth user
      authEmail = `client_${clientAccount.client_id}@portal.local`;
      
      console.log('Creating new auth user for client:', clientAccount.client_id, 'with email:', authEmail);

      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          client_id: clientAccount.client_id,
          trainer_id: clientAccount.trainer_id,
          is_client_portal_user: true,
        }
      });

      if (createAuthError) {
        // If user already exists with this email, try to get them
        if (createAuthError.message?.includes('already been registered')) {
          console.log('Auth user already exists, fetching by email');
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === authEmail);
          
          if (existingUser) {
            authUserId = existingUser.id;
            // Update password to match current
            await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: password });
          } else {
            console.error('Failed to find existing auth user');
            return new Response(
              JSON.stringify({ error: 'Chyba při nastavení účtu. Kontaktujte trenéra.' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error('Failed to create auth user:', createAuthError);
          return new Response(
            JSON.stringify({ error: 'Chyba při vytváření účtu. Kontaktujte trenéra.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        authUserId = newAuthUser.user.id;
      }

      // Update client_accounts with the new auth_user_id
      const { error: updateError } = await supabaseAdmin
        .from('client_accounts')
        .update({ 
          auth_user_id: authUserId,
          user_id: authUserId, // Also set user_id for RLS compatibility
          updated_at: new Date().toISOString()
        })
        .eq('id', clientAccount.id);

      if (updateError) {
        console.error('Failed to update client_accounts with auth_user_id:', updateError);
      } else {
        console.log('Successfully linked auth user', authUserId, 'to client account', clientAccount.id);
      }
    }

    // Now sign in with Supabase Auth
    let authData: any = null;
    let authError: any = null;

    const signInResult = await supabaseClient.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    authData = signInResult.data;
    authError = signInResult.error;

    // If Auth login fails but portal_password matches, sync password to Auth and retry
    if (authError && authUserId && clientAccount.portal_password && password === clientAccount.portal_password) {
      console.log('Auth password mismatch but portal_password matches - syncing password for:', authUserId);
      
      const { error: syncError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: password,
      });

      if (!syncError) {
        // Retry sign in after sync
        const retryResult = await supabaseClient.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        authData = retryResult.data;
        authError = retryResult.error;
        
        if (!authError) {
          console.log('Password synced and login successful for:', loginIdentifier);
        }
      } else {
        console.error('Failed to sync password to Auth:', syncError);
      }
    }

    // Log the attempt
    await supabaseAdmin.from('login_attempts').insert({
      email: loginIdentifier.toLowerCase(),
      ip_address: ipAddress,
      success: !authError,
    });

    if (authError) {
      console.log('Login failed for:', loginIdentifier, 'error:', authError.message);
      
      await supabaseAdmin.from('audit_events').insert({
        auth_user_id: authUserId,
        client_id: clientAccount.client_id,
        trainer_id: clientAccount.trainer_id,
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
      auth_user_id: authData.user.id,
      action: 'login_success',
      metadata: { method: 'supabase_auth', auto_created: !clientAccount.auth_user_id },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    console.log('Successful login for client:', clientAccount.client_id);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        user: {
          id: authData.user.id,
          email: authData.user.email,
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
