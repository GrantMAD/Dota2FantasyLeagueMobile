import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { removePushToken } from '../src/features/account/api';
import { unregisterDevicePushToken } from '../src/lib/push-token-registration';

jest.mock('expo-constants', () => ({ default: { expoConfig: null, easConfig: null } }));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('expo-notifications', () => ({}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('../src/features/account/api', () => ({
  removePushToken: jest.fn(),
  registerPushToken: jest.fn(),
}));

describe('push-token cleanup', () => {
  it('skips SecureStore and device token cleanup on web', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');

    await expect(unregisterDevicePushToken('user-1')).resolves.toBeUndefined();

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(removePushToken).not.toHaveBeenCalled();
  });
});
