import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';

interface ConnectivityStatus {
  isOffline: boolean;
  statusError: string | null;
  refreshNetworkStatus: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityStatus | null>(null);

export function isNetworkOnline(state: Network.NetworkState): boolean | null {
  if (state.isConnected === false || state.isInternetReachable === false) return false;
  if (state.isConnected === true || state.isInternetReachable === true) return true;
  return null;
}

function networkErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to determine network connectivity.';
}

export function ConnectivityProvider({ children }: PropsWithChildren) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  const applyNetworkState = useCallback((state: Network.NetworkState) => {
    const online = isNetworkOnline(state);
    setIsOnline(online);
    setStatusError(null);
    if (online !== null) onlineManager.setOnline(online);
  }, []);

  const refreshNetworkStatus = useCallback(async () => {
    try {
      applyNetworkState(await Network.getNetworkStateAsync());
    } catch (error: unknown) {
      setStatusError(networkErrorMessage(error));
    }
  }, [applyNetworkState]);

  useEffect(() => {
    let active = true;
    let eventSequence = 0;
    let subscription: ReturnType<typeof Network.addNetworkStateListener> | null = null;
    try {
      subscription = Network.addNetworkStateListener((state) => {
        if (active) {
          eventSequence += 1;
          applyNetworkState(state);
        }
      });
    } catch (error: unknown) {
      const message = networkErrorMessage(error);
      void Promise.resolve().then(() => {
        if (active) setListenerError(message);
      });
    }

    const initialEventSequence = eventSequence;
    void Network.getNetworkStateAsync().then((state) => {
      if (active && eventSequence === initialEventSequence) applyNetworkState(state);
    }).catch((error: unknown) => {
      if (!active || eventSequence !== initialEventSequence) return;
      setStatusError(networkErrorMessage(error));
    });

    return () => {
      active = false;
      subscription?.remove();
      onlineManager.setOnline(true);
    };
  }, [applyNetworkState]);

  const value = useMemo<ConnectivityStatus>(
    () => ({
      isOffline: isOnline === false,
      statusError: listenerError ?? statusError,
      refreshNetworkStatus,
    }),
    [isOnline, listenerError, refreshNetworkStatus, statusError]
  );

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivityStatus {
  const context = useContext(ConnectivityContext);
  if (!context) throw new Error('useConnectivity must be used within ConnectivityProvider.');
  return context;
}

export function NetworkStatusBanner() {
  const { isOffline, statusError, refreshNetworkStatus } = useConnectivity();
  if (!isOffline && !statusError) return null;

  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-center justify-between gap-3 px-4 py-2 ${
        isOffline ? 'bg-amber-950' : 'bg-red-950'
      }`}
    >
      <Text className={`flex-1 text-xs leading-5 ${isOffline ? 'text-amber-100' : 'text-red-100'}`}>
        {isOffline
          ? 'You are offline. Previously loaded information remains available; updates will not sync until you reconnect.'
          : `Connection status unavailable. ${statusError}`}
      </Text>
      {statusError ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-10 justify-center px-2"
          onPress={() => void refreshNetworkStatus()}
        >
          <Text className="text-xs font-bold text-white">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
