import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { registerPushToken, removePushToken } from '@/src/features/account/api';

const secureTokenKey = (userId: string) => `fantasy-dota-push-token-${userId}`;
const secureConsentKey = (userId: string) => `fantasy-dota-push-consent-${userId}`;
const expoPushTokenPattern = /^(Expo|Exponent)PushToken\[[^\]]+\]$/;

function getPushPlatform(): 'ios' | 'android' {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error('Device push notifications are available only on iOS and Android.');
  }
  return Platform.OS;
}

function getEasProjectId(): string | null {
  const configuredId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return typeof configuredId === 'string' && configuredId.trim() ? configuredId.trim() : null;
}

async function prepareAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Fantasy updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#fb923c',
  });
}

async function getCurrentExpoToken(projectId: string): Promise<string> {
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (token.length > 500 || !expoPushTokenPattern.test(token)) {
    throw new Error('Expo returned a push token in an unexpected format.');
  }
  return token;
}

async function saveTokenForUser(userId: string, token: string): Promise<void> {
  const platform = getPushPlatform();
  await SecureStore.setItemAsync(secureTokenKey(userId), token);
  await registerPushToken(token, platform);
}

export async function requestAndRegisterPushNotifications(userId: string): Promise<void> {
  getPushPlatform();
  if (!Device.isDevice) {
    throw new Error('Push notifications must be set up on a physical iOS or Android device.');
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    throw new Error('Push notifications are not configured for this app yet. Add its EAS project ID and rebuild.');
  }

  await prepareAndroidChannel();
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) permissions = await Notifications.requestPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('Notification permission was not granted. You can enable it in your device settings.');
  }

  const token = await getCurrentExpoToken(projectId);
  await SecureStore.setItemAsync(secureConsentKey(userId), 'true');
  await saveTokenForUser(userId, token);
}

export async function syncExistingPushRegistration(userId: string): Promise<boolean> {
  if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !Device.isDevice) return false;
  const optedIn = await SecureStore.getItemAsync(secureConsentKey(userId));
  if (optedIn !== 'true') {
    await unregisterDevicePushToken(userId);
    return false;
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    await unregisterDevicePushToken(userId);
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    await unregisterDevicePushToken(userId);
    return false;
  }
  await prepareAndroidChannel();

  const token = await getCurrentExpoToken(projectId);
  await saveTokenForUser(userId, token);
  return true;
}

export async function unregisterDevicePushToken(userId: string): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const key = secureTokenKey(userId);
  const token = await SecureStore.getItemAsync(key);
  if (!token) return;

  await removePushToken(token);
  await SecureStore.deleteItemAsync(key);
}
