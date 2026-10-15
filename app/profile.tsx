import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import {
  getManagerProfile,
  type ManagerProfile,
  updateBannerTheme,
  updateManagerProfile,
  updatePushNotificationPreference,
} from '@/src/features/account/api';
import {
  MOBILE_BANNER_THEMES,
  getMobileBannerTheme,
} from '@/src/features/account/bannerThemes';
import { AccountHealthProgress } from '@/src/features/account/AccountHealthProgress';
import { ProfileAchievements } from '@/src/features/account/ProfileAchievements';
import { computeAchievements } from '@/src/features/account/achievementsData';
import { usePushNotificationStatus } from '@/src/lib/push-notifications';
import {
  requestAndRegisterPushNotifications,
  unregisterDevicePushToken,
} from '@/src/lib/push-token-registration';
import { useAuth } from '@/src/lib/auth';
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
            Your competitive identity, hero banner, fantasy career snapshot, account details, and achievements.
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
            <ProfileAchievementsSection profile={query.data} />
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
  const queryClient = useQueryClient();
  const fantasyQuery = useFantasyContext();
  const label = profile.displayName?.trim() || profile.username;
  const initials = label.trim().slice(0, 1).toUpperCase() || 'U';
  const avatarUrl = profile.avatarUrl && /^https?:\/\//i.test(profile.avatarUrl) ? profile.avatarUrl : null;
  const hasSquad = Boolean(fantasyQuery.data?.ownedPlayers.length);
  const hasBio = Boolean(profile.bio?.trim());

  const currentTheme = getMobileBannerTheme(profile.bannerTheme);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const bannerMutation = useMutation({
    mutationFn: updateBannerTheme,
    onSuccess: (updated) => {
      queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], updated);
      setThemeModalVisible(false);
    },
    onError: (err: Error) => {
      Alert.alert('Unable to save banner theme', err.message);
    },
  });

  const healthItems: [string, boolean][] = [
    ['Profile identity', Boolean(profile.displayName?.trim() || profile.username)],
    ['Fantasy squad', hasSquad],
    ['Bio added', hasBio],
    ['Preferences set', Boolean(profile.timezone)],
  ];
  const completedHealthCount = healthItems.filter(([, complete]) => complete).length;

  return (
    <View className="gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      {/* Hero Banner Header */}
      <View className={`h-28 ${currentTheme.bgClass} justify-between p-3`}>
        <View className="flex-row items-center justify-between">
          <View className={`rounded-full px-2 py-0.5 ${currentTheme.badgeBg}`}>
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${currentTheme.badgeText}`}>
              {currentTheme.name} ({currentTheme.dotaRole})
            </Text>
          </View>
          <Pressable
            onPress={() => setThemeModalVisible(true)}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1"
          >
            <Text className="text-xs font-semibold text-slate-200">Change Theme</Text>
          </Pressable>
        </View>
      </View>

      {/* Avatar and Info Header */}
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

        {/* Account Health with Circular Gauge */}
        <View className="gap-3 border-t border-slate-800 pt-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-semibold text-white">Account health</Text>
              <Text className="text-xs text-slate-400">Readiness for competitive seasons</Text>
            </View>
            <AccountHealthProgress completed={completedHealthCount} total={healthItems.length} />
          </View>
          {healthItems.map(([itemLabel, complete]) => (
            <HealthRow key={itemLabel} label={itemLabel} complete={complete} />
          ))}
        </View>
      </View>

      {/* Banner Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-5">
          <View className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <Text className="text-base font-bold text-white">Choose Hero Banner Theme</Text>
            <Text className="mt-1 text-xs text-slate-400">
              Customize your profile banner inspired by Dota hero roles.
            </Text>

            <View className="mt-4 gap-2">
              {MOBILE_BANNER_THEMES.map((theme) => {
                const isSelected = theme.id === currentTheme.id;
                return (
                  <Pressable
                    key={theme.id}
                    onPress={() => bannerMutation.mutate(theme.id)}
                    className={`flex-row items-center justify-between rounded-xl border p-3 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-950/40'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className={`h-6 w-6 rounded-md ${theme.bgClass}`} />
                      <View>
                        <Text className="text-sm font-bold text-white">{theme.name}</Text>
                        <Text className="text-xs text-slate-400">{theme.heroInspiration}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Text className="text-sm font-bold text-brand-400">✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setThemeModalVisible(false)}
              className="mt-4 items-center rounded-xl border border-slate-700 bg-slate-800 py-2.5"
            >
              <Text className="text-sm font-semibold text-slate-200">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProfileAchievementsSection({ profile }: { profile: ManagerProfile }) {
  const fantasyQuery = useFantasyContext();
  const achievements = computeAchievements({
    hasSquad: Boolean(fantasyQuery.data?.ownedPlayers.length),
    totalPoints: Number(fantasyQuery.data?.totalPoints ?? 0),
    globalRank: fantasyQuery.data?.globalRank ?? null,
    hasBio: Boolean(profile.bio?.trim()),
    timezone: profile.timezone,
    countryCode: profile.countryCode,
  });

  return <ProfileAchievements achievements={achievements} />;
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
    <View className="gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <View>
        <Text className="text-xl font-bold text-white">Edit Profile & Account</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-400">
          Update the profile details shown across leagues and configure device alerts.
        </Text>
      </View>

      {notice ? (
        <View className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <Text className="text-sm text-slate-200">{notice}</Text>
        </View>
      ) : null}

      <View className="gap-4">
        <TextField
          autoCapitalize="none"
          label="Username"
          value={username}
          onChangeText={setUsername}
        />
        <TextField
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextField
          label="Bio"
          multiline
          numberOfLines={3}
          value={bio}
          onChangeText={setBio}
        />
        <TextField
          autoCapitalize="characters"
          label="Country Code"
          maxLength={2}
          value={countryCode}
          onChangeText={setCountryCode}
        />
        <TextField
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
        />
      </View>

      <View className="gap-1 border-t border-slate-800 pt-4">
        <Text className="text-base font-semibold text-white">Preferences & Notifications</Text>
        <PreferenceToggle
          label="Email notifications"
          description="Receive competition reminders and gameweek digests."
          value={emailNotifications}
          onChange={setEmailNotifications}
        />
        <PreferenceToggle
          label="Push notifications"
          description="Receive deadline alerts and match results on this device."
          value={pushNotifications}
          onChange={setPushNotifications}
        />
        {!pushNotifications ? (
          <Pressable
            accessibilityRole="button"
            className="mt-2 rounded-xl border border-brand-500/30 bg-brand-500/10 py-3 items-center"
            disabled={enablingPush}
            onPress={handleEnablePush}
          >
            <Text className="text-sm font-semibold text-brand-300">
              {enablingPush ? 'Registering device...' : 'Enable device push notifications'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Button
        accessibilityLabel="Save profile changes"
        disabled={save.isPending}
        label={save.isPending ? 'Saving changes...' : 'Save Profile'}
        onPress={handleSave}
      />
    </View>
  );
}
