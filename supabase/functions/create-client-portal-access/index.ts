import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate secure password: 4 digits + 4 letters, shuffled
function generatePassword(): string {
  const digits = '0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  const chars: string[] = [];
  
  // Add 4 random digits
  for (let i = 0; i < 4; i++) {
    chars.push(digits[Math.floor(Math.random() * digits.length)]);
  }
  
  // Add 4 random letters
  for (let i = 0; i < 4; i++) {
    chars.push(letters[Math.floor(Math.random() * letters.length)]);
  }
  
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user management
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

    const { client_id } = await req.json();
    
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'Chybí client_id' }),
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
      console.error('Client lookup error:', clientError);
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

    if (!client.email) {
      return new Response(
        JSON.stringify({ error: 'Klient nemá vyplněný email. Přidejte email do profilu klienta.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if client already has portal access
    const { data: existingAccount } = await supabaseAdmin
      .from('client_accounts')
      .select('id, auth_user_id, status')
      .eq('client_id', client_id)
      .maybeSingle();

    const password = generatePassword();
    let authUserId: string;
    let isNewAccount = false;

    if (existingAccount?.auth_user_id) {
      // Reset password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAccount.auth_user_id,
        { password }
      );

      if (updateError) {
        console.error('Password reset error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Nepodařilo se resetovat heslo' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = existingAccount.auth_user_id;

      // Update last password reset timestamp
      await supabaseAdmin
        .from('client_accounts')
        .update({ 
          last_password_reset_at: new Date().toISOString(),
          status: 'active' 
        })
        .eq('id', existingAccount.id);

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        trainer_id: trainer.id,
        client_id: client_id,
        auth_user_id: authUserId,
        action: 'reset_password',
        metadata: { client_name: client.name, client_email: client.email },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        user_agent: req.headers.get('user-agent'),
      });

    } else {
      // Try to create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: client.email,
        password,
        email_confirm: true,
        user_metadata: {
          is_client: true,
          client_id: client_id,
          trainer_id: trainer.id,
        }
      });

      if (createError) {
        console.error('User creation error:', createError);
        
        // Check if user already exists - try to link existing user
        if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
          console.log('Email already exists, attempting to find and link existing user');
          
          // Find existing user by email
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            console.error('Error listing users:', listError);
            return new Response(
              JSON.stringify({ error: 'Nepodařilo se najít existujícího uživatele' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === client.email.toLowerCase());
          
          if (!existingUser) {
            console.error('Could not find existing user by email');
            return new Response(
              JSON.stringify({ error: 'Email existuje, ale uživatel nebyl nalezen' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Reset password for existing user
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { 
              password,
              user_metadata: {
                ...existingUser.user_metadata,
                is_client: true,
                client_id: client_id,
                trainer_id: trainer.id,
              }
            }
          );

          if (updateError) {
            console.error('Password update error for existing user:', updateError);
            return new Response(
              JSON.stringify({ error: 'Nepodařilo se aktualizovat heslo existujícího uživatele' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          authUserId = existingUser.id;
          console.log('Linked existing auth user:', authUserId);
          
        } else {
          return new Response(
            JSON.stringify({ error: 'Nepodařilo se vytvořit účet' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        authUserId = newUser.user.id;
      }
      
      isNewAccount = true;

      // Upsert client_accounts
      const { error: upsertError } = await supabaseAdmin
        .from('client_accounts')
        .upsert({
          client_id: client_id,
          trainer_id: trainer.id,
          user_id: authUserId,
          auth_user_id: authUserId,
          status: 'active',
          is_active: true,
          created_by_trainer_id: trainer.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'client_id'
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Nepodařilo se vytvořit účet v databázi' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        trainer_id: trainer.id,
        client_id: client_id,
        auth_user_id: authUserId,
        action: 'create_access',
        metadata: { client_name: client.name, client_email: client.email },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
        user_agent: req.headers.get('user-agent'),
      });
    }

    console.log(`Portal access ${isNewAccount ? 'created' : 'reset'} for client ${client_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: client.email,
        password: password, // Only returned once, never stored
        isNewAccount,
        clientName: client.name,
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
