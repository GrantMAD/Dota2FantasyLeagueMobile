import { ApiError, apiFetch, unauthenticatedApiPost } from '@/src/lib/api';

export type ThemePreference = 'light' | 'dark';

export interface ManagerProfile {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
  memberSince: string;
  themePreference: ThemePreference;
}

export interface ManagerProfileUpdate {
  username: string;
  displayName: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface ManagerSignupResult {
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseProfile(value: unknown): ManagerProfile | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    !(value.display_name === null || typeof value.display_name === 'string') ||
    !(value.email === null || typeof value.email === 'string') ||
    typeof value.email_notifications !== 'boolean' ||
    typeof value.push_notifications !== 'boolean' ||
    (value.theme_preference !== 'light' && value.theme_preference !== 'dark') ||
    typeof value.member_since !== 'string'
  ) {
    throw new ApiError('Profile data was returned in an unexpected format.', 502);
  }
  return {
    id: value.id,
    email: value.email,
    username: value.username,
    displayName: value.display_name,
    emailNotifications: value.email_notifications,
    pushNotifications: value.push_notifications,
    memberSince: value.member_since,
    themePreference: value.theme_preference,
  };
}

function parseProfileResponse(value: unknown): ManagerProfile | null {
  if (!isRecord(value) || !('profile' in value)) {
    throw new ApiError('Profile data was returned in an unexpected format.', 502);
  }
  return parseProfile(value.profile);
}

export async function getManagerProfile(): Promise<ManagerProfile | null> {
  return parseProfileResponse(await apiFetch<unknown>('/api/user/profile'));
}

export async function getThemePreference(): Promise<ThemePreference> {
  const result: unknown = await apiFetch('/api/user/theme');
  if (!isRecord(result) || (result.theme !== 'light' && result.theme !== 'dark')) {
    throw new ApiError('Theme preference was returned in an unexpected format.', 502);
  }
  return result.theme;
}

export async function updateThemePreference(theme: ThemePreference): Promise<ThemePreference> {
  const result: unknown = await apiFetch('/api/user/theme', {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  });
  if (!isRecord(result) || result.theme !== theme) {
    throw new ApiError('The theme preference was not saved.', 502);
  }
  return theme;
}

export async function updateManagerProfile(update: ManagerProfileUpdate): Promise<ManagerProfile> {
  const result = parseProfileResponse(await apiFetch<unknown>('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify({
      username: update.username,
      display_name: update.displayName,
      email_notifications: update.emailNotifications,
      push_notifications: update.pushNotifications,
    }),
  }));
  if (!result) throw new ApiError('The profile update did not return a saved profile.', 502);
  return result;
}

export async function updatePushNotificationPreference(enabled: boolean): Promise<ManagerProfile> {
  const result = parseProfileResponse(await apiFetch<unknown>('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify({ push_notifications: enabled }),
  }));
  if (!result) throw new ApiError('The push notification preference was not saved.', 502);
  return result;
}

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const result: unknown = await apiFetch('/api/user/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
  if (!isRecord(result) || result.registered !== true) {
    throw new ApiError('This device could not be registered for push notifications.', 502);
  }
}

export async function removePushToken(token: string): Promise<void> {
  const result: unknown = await apiFetch('/api/user/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
  if (!isRecord(result) || result.removed !== true) {
    throw new ApiError('This device could not be removed from push notifications.', 502);
  }
}

export async function createManagerAccount(input: {
  email: string;
  username: string;
  password: string;
}): Promise<ManagerSignupResult> {
  const result: unknown = await unauthenticatedApiPost('/api/auth/signup', {
    email: input.email.trim().toLowerCase(),
    username: input.username.trim(),
    password: input.password,
  });
  if (!isRecord(result) || typeof result.message !== 'string' || !isRecord(result.user) || typeof result.user.id !== 'string') {
    throw new ApiError('Account creation returned an unexpected response.', 502);
  }
  return { message: result.message };
}
