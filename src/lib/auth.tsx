import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { queryClient } from './query-client';
import { getSupabaseClient } from './supabase';
import { unregisterDevicePushToken } from './push-token-registration';

interface AuthContextValue {
  session: Session | null;
  ready: boolean;
  configurationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    try {
      const supabase = getSupabaseClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) {
          const nextUserId = nextSession?.user.id ?? null;
          if (activeUserId.current && activeUserId.current !== nextUserId) {
            queryClient.clear();
          }
          activeUserId.current = nextUserId;
          setSession(nextSession);
          setReady(true);
        }
      });
      const appStateSubscription = Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              supabase.auth.startAutoRefresh();
            } else {
              supabase.auth.stopAutoRefresh();
            }
          });

      if (Platform.OS !== 'web') {
        if (AppState.currentState === 'background' || AppState.currentState === 'inactive') {
          supabase.auth.stopAutoRefresh();
        } else {
          supabase.auth.startAutoRefresh();
        }
      }

      void supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setConfigurationError(`Unable to restore your session: ${error.message}`);
        } else {
          const restoredUserId = data.session?.user.id ?? null;
          if (activeUserId.current && activeUserId.current !== restoredUserId) {
            queryClient.clear();
          }
          activeUserId.current = restoredUserId;
          setSession(data.session);
        }
        setReady(true);
      }).catch((error: unknown) => {
        if (!active) return;
        setConfigurationError(error instanceof Error ? error.message : 'Unable to restore your session.');
        setReady(true);
      });

      return () => {
        active = false;
        subscription.unsubscribe();
        appStateSubscription?.remove();
        if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
      };
    } catch (error) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setConfigurationError(error instanceof Error ? error.message : 'Mobile authentication is not configured.');
        setReady(true);
      });
      return () => {
        active = false;
      };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      configurationError,
      signIn: async (email, password) => {
        const { error } = await getSupabaseClient().auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw new Error(error.message);
      },
      signOut: async () => {
        if (session?.user.id) {
          await unregisterDevicePushToken(session.user.id);
        }
        const { error } = await getSupabaseClient().auth.signOut();
        if (error) throw new Error(error.message);
      },
    }),
    [configurationError, ready, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
