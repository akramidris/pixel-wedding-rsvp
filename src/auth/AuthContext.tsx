import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { requireSupabase, supabase } from '../lib/supabase';
import type { Profile } from '../types/wedding';

interface AuthValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [verified, setVerified] = useState<{ token: string; user: User; profile: Profile } | null>(
    null,
  );
  const [failedToken, setFailedToken] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      // Keep this synchronous; profile requests run outside Auth's session lock.
      if (mounted) setSession(next);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) setError('Your session could not be restored. Please sign in again.');
        setSession(data.session);
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
          setError('Your session could not be restored.');
        }
      });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setError('');
    setFailedToken('');
    if (!session || !supabase) {
      setVerified(null);
      return;
    }
    const client = supabase,
      token = session.access_token;
    void (async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await client.auth.getUser();
        if (userError || !user) throw new Error('Your session has expired. Please sign in again.');
        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('id,role,display_name,created_at')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError || !profile || !['admin', 'customer'].includes(profile.role))
          throw new Error(
            'Your account profile is unavailable. Please contact the platform administrator.',
          );
        if (!cancelled) setVerified({ token, user, profile });
      } catch (cause) {
        if (!cancelled) {
          setVerified(null);
          setFailedToken(token);
          setError(cause instanceof Error ? cause.message : 'Account details could not be loaded.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);
  const signIn = useCallback(async (email: string, password: string) => {
    setError('');
    const { error: authError } = await requireSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError)
      throw new Error('Sign-in failed. Check your email and password, then try again.');
  }, []);
  const signOut = useCallback(async () => {
    const { error: authError } = await requireSupabase().auth.signOut();
    if (authError)
      throw new Error('Sign-out could not finish. Check your connection and try again.');
    setSession(null);
    setVerified(null);
  }, []);
  const valid = !!session && verified?.token === session.access_token;
  const loading =
    session === undefined || (!!session && !valid && failedToken !== session.access_token);
  return (
    <AuthContext.Provider
      value={{
        user: valid ? verified.user : null,
        profile: valid ? verified.profile : null,
        loading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('Authentication must be used inside AuthProvider.');
  return auth;
}
