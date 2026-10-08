import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getManagerProfile } from '@/src/features/account/api';
import { managerReturnRoute } from '@/src/lib/deep-links';
import { useAuth } from '@/src/lib/auth';
import {
  syncExistingPushRegistration,
  unregisterDevicePushToken,
} from '@/src/lib/push-token-registration';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface PushNotificationStatus {
  isDeviceRegistered: boolean;
  syncError: string | null;
  markDeviceRegistered: (userId: string) => void;
}

const PushNotificationStatusContext = createContext<PushNotificationStatus | null>(null);

export function MobilePushNotificationsProvider({ children }: PropsWithChildren) {
  const { ready, session } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? null;
  const profileQuery = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    enabled: ready && Boolean(userId),
    staleTime: 60_000,
  });
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInProgress = useRef(false);
  const handledResponseId = useRef<string | null>(null);
  const isDeviceRegistered = Boolean(userId) && registeredUserId === userId;
  const pushEnabled = profileQuery.data?.pushNotifications;

  const markDeviceRegistered = useCallback((registeredId: string) => {
    setRegisteredUserId(registeredId);
    setSyncError(null);
  }, []);

  const registrationMutation = useMutation({
    mutationFn: syncExistingPushRegistration,
    onSuccess: (registered, registeredId) => {
      setRegisteredUserId(registered ? registeredId : null);
      setSyncError(null);
    },
    onError: (error: unknown) => {
      setSyncError(error instanceof Error ? error.message : 'This device could not sync push registration.');
    },
  });
  const mutateRegistration = registrationMutation.mutate;

  const syncRegistration = useCallback(() => {
    if (!userId || syncInProgress.current) return;
    syncInProgress.current = true;
    mutateRegistration(userId, {
      onSettled: () => {
        syncInProgress.current = false;
      },
    });
  }, [mutateRegistration, userId]);

  useEffect(() => {
    if (!ready || !userId || pushEnabled === undefined) return;

    if (!pushEnabled) {
      void unregisterDevicePushToken(userId).then(() => {
        setRegisteredUserId(null);
        setSyncError(null);
      }).catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : 'This device could not be removed from push notifications.');
      });
      return;
    }

    void syncRegistration();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncRegistration();
    });
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      void syncRegistration();
    });
    return () => {
      appStateSubscription.remove();
      tokenSubscription.remove();
    };
  }, [pushEnabled, ready, syncRegistration, userId]);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      if (handledResponseId.current === responseId) return;
      handledResponseId.current = responseId;
      const route = response.notification.request.content.data?.route;
      router.push(managerReturnRoute(typeof route === 'string' ? route : '/notifications'));
      void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : 'Unable to clear the handled notification response.');
      });
    };
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then(handleResponse).catch((error: unknown) => {
      setSyncError(error instanceof Error ? error.message : 'Unable to restore the notification destination.');
    });
    return () => responseSubscription.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void Notifications.setNotificationChannelAsync('default', {
      name: 'Fantasy updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14b8a6',
    }).catch((error: unknown) => {
      setSyncError(error instanceof Error ? error.message : 'Android notification channel setup failed.');
    });
  }, []);

  return (
    <PushNotificationStatusContext.Provider value={{ isDeviceRegistered, syncError, markDeviceRegistered }}>
      {children}
    </PushNotificationStatusContext.Provider>
  );
}

export function usePushNotificationStatus(): PushNotificationStatus {
  const context = useContext(PushNotificationStatusContext);
  if (!context) throw new Error('usePushNotificationStatus must be used within MobilePushNotificationsProvider.');
  return context;
}
