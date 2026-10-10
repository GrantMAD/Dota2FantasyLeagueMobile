import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';
import { AppState, Pressable, Text, View, type AppStateStatus } from 'react-native';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { queryClient } from '../src/lib/query-client';
import { getSupabaseClient } from '../src/lib/supabase';
import { unregisterDevicePushToken } from '../src/lib/push-token-registration';

jest.mock('../src/lib/query-client', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('../src/lib/supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('../src/lib/push-token-registration', () => ({
  unregisterDevicePushToken: jest.fn(),
}));

type AuthListener = (event: string, session: Session | null) => void;

function createSession(userId: string): Session {
  return {
    access_token: `access-${userId}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `refresh-${userId}`,
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${userId}@example.test`,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

function AuthProbe() {
  const { configurationError, ready, session, signIn, signOut } = useAuth();
  return (
    <View>
      <Text>{ready ? 'ready' : 'loading'}</Text>
      <Text>{session?.user.id ?? 'signed-out'}</Text>
      {configurationError ? <Text>{configurationError}</Text> : null}
      <Pressable onPress={() => void signIn(' Manager@Example.Test ', 'secret')}>
        <Text>Sign in</Text>
      </Pressable>
      <Pressable onPress={() => void signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </View>
  );
}

describe('mobile authentication provider', () => {
  const initialSession = createSession('user-1');
  const unsubscribe = jest.fn();
  const getSession = jest.fn();
  const signInWithPassword = jest.fn();
  const signOut = jest.fn();
  const startAutoRefresh = jest.fn();
  const stopAutoRefresh = jest.fn();
  const appStateRemove = jest.fn();
  let authListener: AuthListener | null = null;
  let appStateListener: ((state: AppStateStatus) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    authListener = null;
    appStateListener = null;
    jest.mocked(AppState.addEventListener).mockImplementation((_eventType, listener) => {
      appStateListener = listener;
      return { remove: appStateRemove };
    });
    getSession.mockResolvedValue({ data: { session: initialSession }, error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    jest.mocked(unregisterDevicePushToken).mockResolvedValue(undefined);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        onAuthStateChange: jest.fn((listener: AuthListener) => {
          authListener = listener;
          return { data: { subscription: { unsubscribe } } };
        }),
        getSession,
        signInWithPassword,
        signOut,
        startAutoRefresh,
        stopAutoRefresh,
      },
    } as unknown as ReturnType<typeof getSupabaseClient>);
  });

  it('restores the session and starts and stops token refresh with app lifecycle', async () => {
    const view = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(view.getByText('user-1')).toBeTruthy());
    expect(view.getByText('ready')).toBeTruthy();
    expect(startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(appStateListener).not.toBeNull();

    act(() => appStateListener?.('background'));
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);

    act(() => appStateListener?.('active'));
    expect(startAutoRefresh).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(appStateRemove).toHaveBeenCalledTimes(1);
    expect(stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('clears user-scoped query data when the authenticated account changes', async () => {
    const view = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );
    await waitFor(() => expect(view.getByText('user-1')).toBeTruthy());

    act(() => {
      authListener?.('SIGNED_IN', createSession('user-2'));
    });

    await waitFor(() => expect(view.getByText('user-2')).toBeTruthy());
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('normalizes the sign-in email and unregisters device push before signing out', async () => {
    const view = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );
    await waitFor(() => expect(view.getByText('user-1')).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByText('Sign in'));
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'manager@example.test',
      password: 'secret',
    });

    await act(async () => {
      fireEvent.press(view.getByText('Sign out'));
    });
    expect(unregisterDevicePushToken).toHaveBeenCalledWith('user-1');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(unregisterDevicePushToken).mock.invocationCallOrder[0]
    ).toBeLessThan(signOut.mock.invocationCallOrder[0]);
  });
});
