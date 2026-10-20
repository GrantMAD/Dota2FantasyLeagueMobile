import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export type ThemePreference = 'light' | 'dark';

export interface ManagerProfile {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  countryCode: string | null;
  timezone: string | null;
  role: string;
  isPremium?: boolean;
  subscriptionTier?: string | null;
  emailNotifications: boolean;
  pushNotifications: boolean;
  memberSince: string;
  themePreference: ThemePreference;
  bannerTheme?: string | null;
}

export interface ManagerProfileUpdate {
  username: string;
  displayName: string;
  bio?: string;
  countryCode?: string;
  timezone?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  bannerTheme?: string;
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
    (value.avatar_url !== undefined && !(value.avatar_url === null || typeof value.avatar_url === 'string')) ||
    (value.bio !== undefined && !(value.bio === null || typeof value.bio === 'string')) ||
    (value.country_code !== undefined && !(value.country_code === null || typeof value.country_code === 'string')) ||
    (value.timezone !== undefined && !(value.timezone === null || typeof value.timezone === 'string')) ||
    (value.role !== undefined && typeof value.role !== 'string') ||
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
    avatarUrl: typeof value.avatar_url === 'string' ? value.avatar_url : null,
    bio: typeof value.bio === 'string' ? value.bio : null,
    countryCode: typeof value.country_code === 'string' ? value.country_code : null,
    timezone: typeof value.timezone === 'string' ? value.timezone : null,
    role: typeof value.role === 'string' ? value.role : 'user',
    isPremium: value.is_premium === true || value.isPremium === true,
    subscriptionTier: typeof value.subscription_tier === 'string'
      ? value.subscription_tier
      : typeof value.subscriptionTier === 'string'
        ? value.subscriptionTier
        : null,
    emailNotifications: value.email_notifications,
    pushNotifications: value.push_notifications,
    memberSince: value.member_since,
    themePreference: value.theme_preference,
    bannerTheme: typeof value.banner_theme === 'string' ? value.banner_theme : null,
  };
}

function parseProfileResponse(value: unknown): ManagerProfile | null {
  if (!isRecord(value) || !('profile' in value)) {
    throw new ApiError('Profile data was returned in an unexpected format.', 502);
  }
  return parseProfile(value.profile);
}

export async function getManagerProfile(): Promise<ManagerProfile | null> {
  const { data, error } = await getSupabaseClient().rpc('mobile_get_profile');
  if (error) throw new ApiError(`Unable to load profile: ${error.message}`, 500);
  return parseProfileResponse(data);
}

export async function getManagerAvatarUrl(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new ApiError(`Unable to load profile image: ${error.message}`, 500);
  if (data === null) return null;
  if (typeof data.avatar_url !== 'string' && data.avatar_url !== null) {
    throw new ApiError('Profile image data was returned in an unexpected format.', 502);
  }
  return data.avatar_url;
}

export async function uploadManagerAvatar(input: {
  uri: string;
  mimeType: string;
  currentAvatarUrl: string | null;
}): Promise<{ avatarUrl: string; userId: string }> {
  const supabase = getSupabaseClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user.id) {
    throw new ApiError('Sign in again before uploading a profile image.', 401);
  }

  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensions[input.mimeType];
  if (!extension) throw new ApiError('Choose a JPEG, PNG, or WebP image.', 400);

  let imageData: ArrayBuffer;
  try {
    const response = await fetch(input.uri);
    if (!response.ok) throw new Error(`Unable to read selected image (${response.status}).`);
    imageData = await response.arrayBuffer();
  } catch (error: unknown) {
    throw new ApiError(
      error instanceof Error ? `Unable to read selected image: ${error.message}` : 'Unable to read selected image.',
      0,
    );
  }

  if (imageData.byteLength === 0 || imageData.byteLength > 5 * 1024 * 1024) {
    throw new ApiError('Profile images must be larger than 0 bytes and 5 MB or smaller.', 400);
  }

  const userId = session.user.id;
  const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${extension}`;
  const objectPath = `${userId}/${objectName}`;
  const storage = supabase.storage.from('profile-avatars');
  const { error: uploadError } = await storage.upload(objectPath, imageData, {
    contentType: input.mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    throw new ApiError(`Unable to upload profile image: ${uploadError.message}`, 400);
  }

  const avatarUrl = storage.getPublicUrl(objectPath).data.publicUrl;
  const { error: profileError } = await supabase.rpc('mobile_update_profile_avatar', {
    p_avatar_url: avatarUrl,
    p_object_path: objectPath,
  });
  if (profileError) {
    const { error: cleanupError } = await storage.remove([objectPath]);
    if (cleanupError) console.error('Unable to remove uploaded avatar after profile update failed:', cleanupError);
    throw new ApiError(`Unable to save profile image: ${profileError.message}`, 400);
  }

  const previousPath = getOwnedProfileAvatarPath(input.currentAvatarUrl, userId);
  if (previousPath && previousPath !== objectPath) {
    const { error: removeError } = await storage.remove([previousPath]);
    if (removeError) console.error('Unable to remove previous profile avatar:', removeError);
  }

  return { avatarUrl, userId };
}

function getOwnedProfileAvatarPath(avatarUrl: string | null, userId: string): string | null {
  if (!avatarUrl || !process.env.EXPO_PUBLIC_SUPABASE_URL) return null;
  try {
    const avatar = new URL(avatarUrl);
    const supabaseUrl = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
    const prefix = `/storage/v1/object/public/profile-avatars/${userId}/`;
    if (avatar.origin !== supabaseUrl.origin || !avatar.pathname.startsWith(prefix)) return null;
    const fileName = decodeURIComponent(avatar.pathname.slice(prefix.length));
    if (!/^[A-Za-z0-9_-]{1,80}\.(jpg|png|webp)$/.test(fileName)) return null;
    return `${userId}/${fileName}`;
  } catch {
    return null;
  }
}

export async function getThemePreference(): Promise<ThemePreference> {
  const profile = await getManagerProfile();
  if (!profile) throw new ApiError('Profile data was returned in an unexpected format.', 502);
  return profile.themePreference;
}

async function updateProfile(updates: Record<string, unknown>): Promise<ManagerProfile> {
  const { data, error } = await getSupabaseClient().rpc('mobile_update_profile', {
    p_updates: updates,
  });
  if (error) throw new ApiError(`Unable to save profile: ${error.message}`, 400);
  const profile = parseProfileResponse(data);
  if (!profile) throw new ApiError('The profile update did not return a saved profile.', 502);
  return profile;
}

export async function updateThemePreference(theme: ThemePreference): Promise<ThemePreference> {
  const profile = await updateProfile({ theme_preference: theme });
  if (profile.themePreference !== theme) {
    throw new ApiError('The theme preference was not saved.', 502);
  }
  return profile.themePreference;
}

export async function updateManagerProfile(update: ManagerProfileUpdate): Promise<ManagerProfile> {
  const updates: Record<string, unknown> = {
    username: update.username,
    display_name: update.displayName,
    email_notifications: update.emailNotifications,
    push_notifications: update.pushNotifications,
  };
  if (update.bio !== undefined) updates.bio = update.bio;
  if (update.countryCode !== undefined) updates.country_code = update.countryCode;
  if (update.timezone !== undefined) updates.timezone = update.timezone;
  if (update.bannerTheme !== undefined) updates.banner_theme = update.bannerTheme;
  const profile = await updateProfile(updates);
  if (
    (update.bio !== undefined && profile.bio !== (update.bio.trim() || null)) ||
    (update.countryCode !== undefined && profile.countryCode !== (update.countryCode.trim().toUpperCase() || null)) ||
    (update.timezone !== undefined && profile.timezone !== (update.timezone.trim() || null))
  ) {
    throw new ApiError('Profile details were not saved. Apply mobile migration 025 and try again.', 502);
  }
  return profile;
}


export async function updateBannerTheme(themeId: string): Promise<ManagerProfile> {
  return updateProfile({ banner_theme: themeId });
}
export async function updatePushNotificationPreference(enabled: boolean): Promise<ManagerProfile> {
  return updateProfile({ push_notifications: enabled });
}

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mobile_register_push_token', {
    p_token: token,
    p_platform: platform,
  });
  if (error) throw new ApiError(`Unable to register this device for push notifications: ${error.message}`, 400);
  if (data !== true) {
    throw new ApiError('This device could not be registered for push notifications.', 502);
  }
}

export async function removePushToken(token: string): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mobile_remove_push_token', {
    p_token: token,
  });
  if (error) throw new ApiError(`Unable to remove this device registration: ${error.message}`, 400);
  if (data !== true) {
    throw new ApiError('This device could not be removed from push notifications.', 502);
  }
}

export async function createManagerAccount(input: {
  email: string;
  username: string;
  password: string;
}): Promise<ManagerSignupResult> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        username: input.username.trim(),
        display_name: input.username.trim(),
        mobile_client: 'fantasy-dota-mobile',
      },
    },
  });
  if (error) {
    throw new ApiError(`Sign up failed: ${error.message}`, 400);
  }
  if (!data.user) {
    throw new ApiError('Account creation did not return a user.', 502);
  }
  return {
    message: data.session
      ? 'Your account was created successfully.'
      : 'User created successfully. Please check your email to confirm.',
  };
}
