import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface ClientAccount {
  id: string;
  user_id: string;
  client_id: string;
  trainer_id: string;
  is_active: boolean;
  last_portal_login: string | null;
  portal_settings: Record<string, unknown>;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  credit_balance: number;
}

export function useClientPortalAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientAccount, setClientAccount] = useState<ClientAccount | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientDataLoaded, setClientDataLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isPasswordOnlyAuth, setIsPasswordOnlyAuth] = useState(false);
  const fetchingRef = useRef(false);

  // Fetch client account data for Supabase Auth users
  const fetchClientData = useCallback(async (userId: string) => {
    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      // Get client account
      const { data: account, error: accountError } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (accountError) throw accountError;

      if (account) {
        setClientAccount(account as ClientAccount);
        setIsClient(true);

        // Get client profile
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id, name, email, phone, credit_balance')
          .eq('id', account.client_id)
          .single();

        if (clientError) throw clientError;
        setClientProfile(client as ClientProfile);

        // Update last login (don't await - fire and forget)
        supabase
          .from('client_accounts')
          .update({ last_portal_login: new Date().toISOString() })
          .eq('id', account.id)
          .then(() => {});

        // Log activity (don't await - fire and forget)
        supabase
          .from('client_portal_activity')
          .upsert({
            client_id: account.client_id,
            activity_date: new Date().toISOString().split('T')[0],
            activity_type: 'portal_login',
          }, { onConflict: 'client_id,activity_date,activity_type' })
          .then(() => {});
      } else {
        setIsClient(false);
        setClientAccount(null);
        setClientProfile(null);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      setIsClient(false);
    } finally {
      setClientDataLoaded(true);
      fetchingRef.current = false;
    }
  }, []);

  // Fetch data for password-only auth using custom token
  const fetchPasswordOnlyClientData = useCallback(async (clientId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Get client account by client_id
      const { data: account, error: accountError } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .maybeSingle();

      if (accountError) throw accountError;

      if (account) {
        setClientAccount(account as ClientAccount);
        setIsClient(true);
        setIsPasswordOnlyAuth(true);

        // Get client profile
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id, name, email, phone, credit_balance')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;
        setClientProfile(client as ClientProfile);
      } else {
        clearPasswordOnlyAuth();
      }
    } catch (error) {
      console.error('Error fetching password-only client data:', error);
      clearPasswordOnlyAuth();
    } finally {
      setClientDataLoaded(true);
      fetchingRef.current = false;
    }
  }, []);

  // Clear password-only auth data
  const clearPasswordOnlyAuth = useCallback(() => {
    localStorage.removeItem('client_portal_token');
    localStorage.removeItem('client_portal_client_id');
    localStorage.removeItem('client_portal_trainer_id');
    localStorage.removeItem('client_portal_account_id');
    setIsClient(false);
    setIsPasswordOnlyAuth(false);
    setClientAccount(null);
    setClientProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Check for password-only auth first (stored in localStorage)
    const storedToken = localStorage.getItem('client_portal_token');

    if (storedToken) {
      // Validate token and load client data
      supabase
        .rpc('validate_client_token', { _token: storedToken })
        .then(({ data, error }) => {
          if (!mounted) return;

          if (error || !data || data.length === 0) {
            // Token invalid, clear it
            clearPasswordOnlyAuth();
            setLoading(false);
            setClientDataLoaded(true);
            return;
          }

          const validatedClientId = data[0]?.client_id as string | undefined;
          const validatedTrainerId = data[0]?.trainer_id as string | undefined;

          if (!validatedClientId) {
            clearPasswordOnlyAuth();
            setLoading(false);
            setClientDataLoaded(true);
            return;
          }

          // Keep local storage in sync
          localStorage.setItem('client_portal_client_id', validatedClientId);
          if (validatedTrainerId) localStorage.setItem('client_portal_trainer_id', validatedTrainerId);

          // Token valid, load client data
          fetchPasswordOnlyClientData(validatedClientId).then(() => {
            if (mounted) setLoading(false);
          });
        });

      // Don't set up Supabase Auth listener if using password-only auth
      return () => {
        mounted = false;
      };
    }
    
    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer data fetch to avoid deadlock
          setTimeout(() => {
            if (mounted) {
              fetchClientData(session.user.id);
            }
          }, 0);
        } else {
          setClientAccount(null);
          setClientProfile(null);
          setIsClient(false);
          setClientDataLoaded(true);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchClientData(session.user.id).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setClientDataLoaded(true);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchClientData, fetchPasswordOnlyClientData, clearPasswordOnlyAuth]);

  // Magic link sign in
  const signInWithMagicLink = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/client/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
    return { error };
  }, []);

  // Standard sign in (fallback)
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  }, []);

  // Sign out - handles both auth methods
  const signOut = useCallback(async () => {
    setClientDataLoaded(false);
    
    // Clear password-only auth
    if (isPasswordOnlyAuth) {
      clearPasswordOnlyAuth();
      return { error: null };
    }
    
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [isPasswordOnlyAuth, clearPasswordOnlyAuth]);

  // Compute final loading state - loading until we have session info AND client data
  const isFullyLoaded = !loading && clientDataLoaded;

  return {
    user,
    session,
    clientAccount,
    clientProfile,
    loading: !isFullyLoaded,
    isClient,
    isPasswordOnlyAuth,
    isAuthenticated: (!!session && isClient) || (isPasswordOnlyAuth && isClient),
    signInWithMagicLink,
    signIn,
    signOut,
  };
}

// Hook to validate token-based access
export function useTokenAccess(token: string | undefined) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const { data, error } = await supabase
          .rpc('validate_client_token', { _token: token });

        if (error) throw error;

        if (data && data.length > 0) {
          setClientId(data[0].client_id);
          setTrainerId(data[0].trainer_id);
          setIsValid(true);

          // Update last used
          await supabase
            .from('client_access_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('token', token);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  return { clientId, trainerId, isValid, loading };
}
