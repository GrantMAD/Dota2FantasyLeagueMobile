import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import {
  getManagerProfile,
  type ManagerProfile,
  updateManagerProfile,
  updatePushNotificationPreference,
} from '@/src/features/account/api';
import { usePushNotificationStatus } from '@/src/lib/push-notifications';
import {
  requestAndRegisterPushNotifications,
  unregisterDevicePushToken,
} from '@/src/lib/push-token-registration';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';
import { useFantasyContext } from '@/src/features/fantasy/hooks';

function PreferenceToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="flex-row items-center justify-between gap-4 border-b border-slate-800 py-4"
      onPress={() => onChange(!value)}
    >
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-white">{label}</Text>
        <Text className="text-sm leading-5 text-slate-400">{description}</Text>
      </View>
      <View className={`h-7 w-12 justify-center rounded-full px-1 ${value ? 'bg-brand-500' : 'bg-slate-700'}`}>
        <View className={`h-5 w-5 rounded-full bg-switch-thumb ${value ? 'self-end' : 'self-start'}`} />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const query = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    staleTime: 60_000,
  });

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Your account</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Profile & Settings</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Your competitive identity, fantasy career snapshot, account details, and notification preferences.
          </Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading profile" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Profile unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">{query.error.message}</Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <ProfileOverview profile={query.data} />
            <ProfileEditor key={query.data.id} profile={query.data} />
          </>
        ) : (
          <View accessibilityRole="alert" className="rounded-2xl border border-amber-800 bg-amber-950 p-5">
            <Text className="font-semibold text-amber-200">Profile not set up</Text>
            <Text className="mt-2 text-sm leading-5 text-amber-100">
              This account does not have a manager profile yet. Contact support to finish setting up your account.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ProfileOverview({ profile }: { profile: ManagerProfile }) {
  const fantasyQuery = useFantasyContext();
  const label = profile.displayName?.trim() || profile.username;
  const initials = label.trim().slice(0, 1).toUpperCase() || 'U';
  const avatarUrl = profile.avatarUrl && /^https?:\/\//i.test(profile.avatarUrl) ? profile.avatarUrl : null;
  const hasSquad = Boolean(fantasyQuery.data?.ownedPlayers.length);
  const hasBio = Boolean(profile.bio?.trim());

  return (
    <View className="gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <View className="h-20 bg-brand-500/15" />
      <View className="-mt-12 flex-row items-end gap-4 px-4">
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-slate-900 bg-slate-800">
          {avatarUrl ? (
            <Image accessibilityLabel={`${label} profile image`} className="h-full w-full" source={{ uri: avatarUrl }} />
          ) : (
            <Text className="text-3xl font-bold text-brand-300">{initials}</Text>
          )}
        </View>
        <View className="flex-1 pb-1">
          <Text className="text-xl font-bold text-white">{label}</Text>
          <Text className="text-sm text-slate-400">@{profile.username}</Text>
        </View>
      </View>
      <View className="gap-3 px-4 pb-4">
        <View className="flex-row gap-2">
          <ProfileMetric label="Fantasy squad" value={hasSquad ? `${fantasyQuery.data?.ownedPlayers.length} players` : 'No squad yet'} />
          <ProfileMetric label="Total points" value={String(fantasyQuery.data?.totalPoints ?? 0)} />
          <ProfileMetric label="Global rank" value={fantasyQuery.data?.globalRank ? `#${fantasyQuery.data.globalRank}` : '—'} />
        </View>
        <View className="gap-2 border-t border-slate-800 pt-3">
          <Text className="font-semibold text-white">About this manager</Text>
          <Text className="text-sm leading-5 text-slate-300">
            {hasBio ? profile.bio : 'Add a short bio to introduce yourself to your league rivals.'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <ProfileTag value={profile.countryCode || 'Country not set'} />
            <ProfileTag value={profile.timezone || 'Timezone not set'} />
            <ProfileTag value={profile.role === 'admin' ? 'Admin access' : 'Manager account'} />
          </View>
        </View>
        <View className="gap-2 border-t border-slate-800 pt-3">
          <Text className="font-semibold text-white">Account health</Text>
          <HealthRow label="Profile identity" complete={Boolean(profile.displayName?.trim() || profile.username)} />
          <HealthRow label="Fantasy squad" complete={hasSquad} />
          <HealthRow label="Bio added" complete={hasBio} />
          <HealthRow label="Preferences set" complete={Boolean(profile.timezone)} />
        </View>
      </View>
    </View>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 rounded-xl bg-slate-950/70 p-3">
      <Text className="text-[10px] uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-1 font-bold text-white" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ProfileTag({ value }: { value: string }) {
  return <Text className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-400">{value}</Text>;
}

function HealthRow({ label, complete }: { label: string; complete: boolean }) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
      <Text className="text-sm text-slate-300">{label}</Text>
      <Text className={`text-xs font-semibold ${complete ? 'text-emerald-300' : 'text-amber-300'}`}>
        {complete ? 'Ready' : 'Review'}
      </Text>
    </View>
  );
}

function ProfileEditor({ profile }: { profile: ManagerProfile }) {
  const queryClient = useQueryClient();
  const themePreference = useMobileTheme();
  const { session } = useAuth();
  const pushStatus = usePushNotificationStatus();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [countryCode, setCountryCode] = useState(profile.countryCode ?? '');
  const [timezone, setTimezone] = useState(profile.timezone ?? 'UTC');
  const [emailNotifications, setEmailNotifications] = useState(profile.emailNotifications);
  const [pushNotifications, setPushNotifications] = useState(profile.pushNotifications);
  const [notice, setNotice] = useState<string | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);

  const save = useMutation({
    mutationFn: updateManagerProfile,
    onSuccess: async (profile) => {
      queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], profile);
      if (!profile.pushNotifications) {
        try {
          await unregisterDevicePushToken(profile.id);
        } catch (error: unknown) {
          setNotice(
            `Notification preference saved, but this device could not be unregistered: ${
              error instanceof Error ? error.message : 'Please try again.'
            }`,
          );
          return;
        }
      }
      setNotice('Your profile and preferences were saved.');
    },
    onError: (error: Error) => setNotice(error.message),
  });

  function handleSave() {
    setNotice(null);
    save.mutate({
      username: username.trim(),
      displayName: displayName.trim(),
      bio: bio.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      timezone: timezone.trim(),
      emailNotifications,
      pushNotifications,
    });
  }

  function handleEnablePush() {
    Alert.alert(
      'Enable device notifications?',
      'Fantasy Dota 2 will send generic update alerts. Open the app to view the full notification.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            void (async () => {
              setEnablingPush(true);
              setNotice(null);
              try {
                if (!session?.user.id) throw new Error('Sign in again to register this device.');
                await requestAndRegisterPushNotifications(profile.id);
                const updatedProfile = await updatePushNotificationPreference(true);
                queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], updatedProfile);
                setPushNotifications(updatedProfile.pushNotifications);
                pushStatus.markDeviceRegistered(profile.id);
                setNotice('Push notifications are enabled for this account and device.');
              } catch (error: unknown) {
                setNotice(error instanceof Error ? error.message : 'Unable to enable device notifications.');
              } finally {
                setEnablingPush(false);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <>
      <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-xs uppercase tracking-wider text-slate-400">Account email</Text>
        <Text className="font-semibold text-white">{profile.email ?? 'Email unavailable'}</Text>
        <Text className="mt-2 text-xs uppercase tracking-wider text-slate-400">Member since</Text>
        <Text className="text-sm text-slate-300">{new Date(profile.memberSince).toLocaleDateString()}</Text>
      </View>

      <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-lg font-bold text-white">Manager profile</Text>
        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          label="Username"
          onChangeText={setUsername}
          placeholder="Manager username"
          value={username}
        />
        <TextField
          autoCapitalize="words"
          label="Display name"
          onChangeText={setDisplayName}
          placeholder="Name shown to other managers"
          value={displayName}
        />
        <TextField
          label="Bio"
          maxLength={500}
          multiline
          onChangeText={setBio}
          placeholder="A short introduction for your league rivals"
          style={{ minHeight: 96 }}
          textAlignVertical="top"
          value={bio}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              autoCapitalize="characters"
              label="Country code"
              maxLength={2}
              onChangeText={setCountryCode}
              placeholder="US"
              value={countryCode}
            />
          </View>
          <View className="flex-1">
            <TextField
              autoCapitalize="none"
              label="Timezone"
              onChangeText={setTimezone}
              placeholder="UTC"
              value={timezone}
            />
          </View>
        </View>
      </View>

      <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <View>
          <Text className="text-lg font-bold text-white">Appearance</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            This preference is shared with the web app.
          </Text>
        </View>
        <View className="flex-row gap-3">
          {(['dark', 'light'] as const).map((theme) => (
            <Pressable
              key={theme}
              accessibilityRole="radio"
              accessibilityState={{
                checked: themePreference.theme === theme,
                disabled: themePreference.isSaving,
              }}
              className={`min-h-11 flex-1 items-center justify-center rounded-xl border ${
                themePreference.theme === theme
                  ? 'border-brand-500 bg-brand-500/15'
                  : 'border-slate-700 bg-slate-950'
              } ${themePreference.isSaving ? 'opacity-50' : ''}`}
              disabled={themePreference.isSaving}
              onPress={() => void themePreference.setTheme(theme).catch((error: unknown) => {
                Alert.alert(
                  'Theme preference could not be saved',
                  error instanceof Error ? error.message : 'Please try again.'
                );
              })}
            >
              <Text className={`font-semibold capitalize ${
                themePreference.theme === theme ? 'text-brand-300' : 'text-slate-300'
              }`}>
                {theme}
              </Text>
            </Pressable>
          ))}
        </View>
        {themePreference.isLoading ? <ActivityIndicator accessibilityLabel="Loading theme preference" color="#14b8a6" /> : null}
        {themePreference.error ? (
          <Text accessibilityRole="alert" className="text-sm text-red-300">
            Theme preference could not be synchronized: {themePreference.error}
          </Text>
        ) : null}
      </View>

      <View className="rounded-2xl border border-slate-800 bg-slate-900 px-4">
        <Text className="pt-4 text-lg font-bold text-white">Notification preferences</Text>
        <PreferenceToggle
          description="Receive account and fantasy updates by email."
          label="Email notifications"
          onChange={setEmailNotifications}
          value={emailNotifications}
        />
        <PreferenceToggle
          description="Allow device alerts for fantasy updates. Device permission and registration are also required."
          label="Push notifications"
          onChange={setPushNotifications}
          value={pushNotifications}
        />
        <View className="gap-2 border-b border-slate-800 py-4">
          <Text className="font-semibold text-white">This device</Text>
          <Text className="text-sm leading-5 text-slate-400">
            {pushStatus.isDeviceRegistered
              ? 'This device is registered for push alerts.'
              : 'Set up this device to receive alerts while the app is closed.'}
          </Text>
          <Button
            disabled={enablingPush}
            label={pushStatus.isDeviceRegistered ? 'Refresh device registration' : 'Enable on this device'}
            loading={enablingPush}
            onPress={handleEnablePush}
          />
          {pushStatus.syncError ? (
            <Text accessibilityRole="alert" className="text-sm text-amber-300">
              Device registration needs attention: {pushStatus.syncError}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-lg font-bold text-white">Account security</Text>
        <Text className="text-sm leading-5 text-slate-400">
          Change a forgotten password through the secure account recovery flow.
        </Text>
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="button" className="min-h-11 justify-center">
            <Text className="font-semibold text-brand-300">Reset password</Text>
          </Pressable>
        </Link>
      </View>

      {notice ? (
        <Text accessibilityRole={save.isError ? 'alert' : 'text'} className={save.isError ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}>
          {notice}
        </Text>
      ) : null}
      <Button
        disabled={save.isPending || !username.trim()}
        label="Save profile"
        loading={save.isPending}
        onPress={handleSave}
      />
    </>
  );
}
