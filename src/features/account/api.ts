import { ApiError, apiFetch } from '@/src/lib/api';

export interface ManagerProfile {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
  memberSince: string;
}

export interface ManagerProfileUpdate {
  username: string;
  displayName: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
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
