import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView as NativeScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
  uploadManagerAvatar,
} from '@/src/features/account/api';
import {
  MOBILE_BANNER_THEMES,
  getMobileBannerTheme,
  type BannerThemeId,
} from '@/src/features/account/bannerThemes';
import { AccountHealthProgress } from '@/src/features/account/AccountHealthProgress';
import { ProfileAchievements } from '@/src/features/account/ProfileAchievements';
import { computeAchievements, getSeasonRankTier } from '@/src/features/account/achievementsData';
import {
  MOBILE_COUNTRY_OPTIONS,
  MOBILE_TIMEZONE_OPTIONS,
  getDefaultTimezoneForCountry,
  type SettingOption,
} from '@/src/features/account/settingOptions';
import { usePushNotificationStatus } from '@/src/lib/push-notifications';
import { requestAndRegisterPushNotifications } from '@/src/lib/push-token-registration';
import { useAuth } from '@/src/lib/auth';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { useMobileTheme } from '@/src/lib/theme';
import { useMobileFeedback } from '@/src/components/MobileFeedbackProvider';

function PreferenceToggle({
  label,
  description,
  value,
  onChange,
  disabled = false,
  unavailable = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  unavailable?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: disabled || !onChange }}
      className={`flex-row items-center justify-between gap-4 border-b border-slate-800 py-4 ${
        disabled || !onChange ? 'opacity-60' : ''
      }`}
      disabled={disabled || !onChange}
      onPress={() => onChange?.(!value)}
    >
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-semibold text-white">{label}</Text>
          {unavailable ? (
            <Text className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Coming Soon
            </Text>
          ) : null}
        </View>
        <Text className="text-sm leading-5 text-slate-400">{description}</Text>
      </View>
      <View className={`h-7 w-12 justify-center rounded-full px-1 ${value ? 'bg-brand-500' : 'bg-slate-700'}`}>
        <View className={`h-5 w-5 rounded-full bg-switch-thumb ${value ? 'self-end' : 'self-start'}`} />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useMobileTheme();
  const query = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    staleTime: 60_000,
  });

  useEffect(() => () => {
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
  }, []);

  function showSaveToast(message: string) {
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    setSaveToast(message);
    saveToastTimer.current = setTimeout(() => {
      setSaveToast(null);
      saveToastTimer.current = null;
    }, 3000);
  }

  const activeTabClasses = theme === 'dark'
    ? 'border-brand-500 bg-brand-500/15 text-brand-300'
    : 'border-brand-600 bg-brand-600/10 text-brand-600';
  const inactiveTabClasses = theme === 'dark'
    ? 'border-slate-700 text-slate-300'
    : 'border-slate-600 text-slate-700';

  return (
    <Screen>
      <View className="px-5 pb-4 pt-5">
        <View className="mb-4">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Your account</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Profile & Settings</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            View your manager profile or manage your account settings.
          </Text>
        </View>

        <View
          accessibilityRole="tablist"
          accessibilityLabel="Profile and settings sections"
          className="flex-row rounded-xl border border-slate-800 bg-slate-900 p-1"
        >
          {(['profile', 'settings'] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                className={`min-h-11 flex-1 items-center justify-center rounded-lg border px-3 ${
                  selected ? activeTabClasses : `border-transparent ${inactiveTabClasses}`
                }`}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected
                      ? theme === 'dark' ? 'text-brand-300' : 'text-brand-600'
                      : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {tab === 'profile' ? 'Profile' : 'Settings'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {query.isPending ? (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8">
          <View accessibilityLabel="Loading profile" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        </ScrollView>
      ) : query.isError ? (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8">
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Profile unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">{query.error.message}</Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : query.data ? (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-5 pb-8"
            style={{ display: activeTab === 'profile' ? 'flex' : 'none' }}
          >
            <ProfileOverview profile={query.data} onSaved={showSaveToast} />
            <ProfileAchievementsSection profile={query.data} />
          </ScrollView>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-5 px-5 pb-8"
            style={{ display: activeTab === 'settings' ? 'flex' : 'none' }}
          >
            <ProfileEditor profile={query.data} onSaved={showSaveToast} />
          </ScrollView>
        </>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8">
          <View accessibilityRole="alert" className="rounded-2xl border border-amber-800 bg-amber-950 p-5">
            <Text className="font-semibold text-amber-200">Profile not set up</Text>
            <Text className="mt-2 text-sm leading-5 text-amber-100">
              This account does not have a manager profile yet. Contact support to finish setting up your account.
            </Text>
          </View>
        </ScrollView>
      )}
      {saveToast ? (
        <View
          accessibilityLiveRegion="polite"
          className="absolute left-5 right-5 top-3 z-50 rounded-xl border border-emerald-500/40 bg-emerald-950 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-emerald-200">{saveToast}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function ProfileOverview({
  profile,
  onSaved,
}: {
  profile: ManagerProfile;
  onSaved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useMobileFeedback();
  const fantasyQuery = useFantasyContext();
  const pushStatus = usePushNotificationStatus();
  const { theme: colorScheme } = useMobileTheme();
  const bannerModalColors = colorScheme === 'dark'
    ? {
        panel: '#0f172a',
        option: '#1e293b',
        border: '#334155',
        text: '#f8fafc',
        secondaryText: '#cbd5e1',
      }
    : {
        panel: '#ffffff',
        option: '#e8eef5',
        border: '#9fb4c9',
        text: '#0f172a',
        secondaryText: '#334155',
      };
  const label = profile.displayName?.trim() || profile.username;
  const initials = label.trim().slice(0, 1).toUpperCase() || 'U';
  const avatarUrl = profile.avatarUrl && /^https?:\/\//i.test(profile.avatarUrl) ? profile.avatarUrl : null;
  const hasSquad = fantasyQuery.data?.hasSquad ?? false;
  const hasBio = Boolean(profile.bio?.trim());

  const [selectedBannerThemeId, setSelectedBannerThemeId] = useState(
    getMobileBannerTheme(profile.bannerTheme).id,
  );
  const [managerDetailsExpanded, setManagerDetailsExpanded] = useState(true);
  const [aboutManagerExpanded, setAboutManagerExpanded] = useState(true);
  const [accountHealthExpanded, setAccountHealthExpanded] = useState(true);
  const currentTheme = getMobileBannerTheme(selectedBannerThemeId);
  const seasonRank = fantasyQuery.data?.globalRank ?? null;
  const seasonRankTier = getSeasonRankTier(seasonRank);
  const memberSinceDate = new Date(profile.memberSince);
  const memberSince = Number.isFinite(memberSinceDate.getTime())
    ? memberSinceDate.toLocaleDateString([], { month: 'short', year: 'numeric' })
    : 'Date unavailable';
  const countryName = MOBILE_COUNTRY_OPTIONS.find((option) => option.value === profile.countryCode)?.label
    ?? profile.countryCode;
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const bannerMutation = useMutation({
    mutationFn: updateBannerTheme,
    onSuccess: (updated, themeId) => {
      queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], updated);
      setThemeModalVisible(false);
      onSaved(`${getMobileBannerTheme(themeId).name} banner theme saved.`);
    },
    onError: (err: Error) => {
      setSelectedBannerThemeId(getMobileBannerTheme(profile.bannerTheme).id);
      notify('Unable to save banner theme', err.message, 'error');
    },
  });

  function selectBannerTheme(themeId: BannerThemeId) {
    if (bannerMutation.isPending) return;
    setSelectedBannerThemeId(themeId);
    bannerMutation.mutate(themeId);
  }

  const healthItems: [string, boolean][] = [
    ['Profile identity', Boolean(profile.displayName?.trim() || profile.username)],
    ['Fantasy squad', hasSquad],
    ['Bio added', hasBio],
    ['Regional settings', Boolean(profile.countryCode && profile.timezone)],
    ['Push notifications', !profile.pushNotifications || pushStatus.isDeviceRegistered],
    ['Theme preference', profile.themePreference === 'light' || profile.themePreference === 'dark'],
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
          <Text className="mt-1 text-xs text-slate-400">Member since {memberSince}</Text>
          <View className="mt-2 self-start rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{seasonRankTier}</Text>
          </View>
        </View>
      </View>

      <View className="gap-3 px-4 pb-4">
        <View className="flex-row gap-2">
          <ProfileMetric label="Fantasy squad" value={hasSquad ? `${fantasyQuery.data?.ownedPlayers.length} players` : 'No squad yet'} />
          <ProfileMetric label="Total points" value={String(fantasyQuery.data?.totalPoints ?? 0)} />
          <ProfileMetric label="Global rank" value={fantasyQuery.data?.globalRank ? `#${fantasyQuery.data.globalRank}` : '—'} />
        </View>

        <View className="gap-2 border-t border-slate-800 pt-3">
          <Pressable
            accessibilityLabel={`${managerDetailsExpanded ? 'Collapse' : 'Expand'} Manager details`}
            accessibilityRole="button"
            accessibilityState={{ expanded: managerDetailsExpanded }}
            className="flex-row items-center justify-between"
            onPress={() => setManagerDetailsExpanded((expanded) => !expanded)}
          >
            <View className="flex-row items-center gap-2">
              <SymbolView
                name={{ ios: 'globe.americas.fill', android: 'public', web: 'public' }}
                size={17}
                tintColor="#34d399"
              />
              <Text className="font-semibold text-white">Manager details</Text>
            </View>
            <Text className="text-lg text-brand-300">{managerDetailsExpanded ? '⌃' : '⌄'}</Text>
          </Pressable>
          {managerDetailsExpanded ? (
            <View className="flex-row flex-wrap gap-2">
              <ProfileTag label="Country" value={countryName || 'Not set'} tone="emerald" />
              <ProfileTag label="Timezone" value={profile.timezone || 'Not set'} tone="sky" />
              <ProfileTag label="Account" value={profile.role === 'admin' ? 'Admin access' : 'Manager'} tone="violet" />
            </View>
          ) : null}
        </View>

        <View className="gap-2 border-t border-slate-800 pt-3">
          <Pressable
            accessibilityLabel={`${aboutManagerExpanded ? 'Collapse' : 'Expand'} About this manager`}
            accessibilityRole="button"
            accessibilityState={{ expanded: aboutManagerExpanded }}
            className="flex-row items-center justify-between"
            onPress={() => setAboutManagerExpanded((expanded) => !expanded)}
          >
            <View className="flex-row items-center gap-2">
              <SymbolView
                name={{ ios: 'person.text.rectangle.fill', android: 'account_box', web: 'account_box' }}
                size={17}
                tintColor="#38bdf8"
              />
              <Text className="font-semibold text-white">About this manager</Text>
            </View>
            <Text className="text-lg text-brand-300">{aboutManagerExpanded ? '⌃' : '⌄'}</Text>
          </Pressable>
          {aboutManagerExpanded ? (
            <Text className="text-sm leading-5 text-slate-300">
              {hasBio ? profile.bio : 'Add a short bio to introduce yourself to your league rivals.'}
            </Text>
          ) : null}
        </View>

        {/* Account Health with Circular Gauge */}
        <View className="gap-3 border-t border-slate-800 pt-3">
          <Pressable
            accessibilityLabel={`${accountHealthExpanded ? 'Collapse' : 'Expand'} Account health`}
            accessibilityRole="button"
            accessibilityState={{ expanded: accountHealthExpanded }}
            className="flex-row items-center justify-between"
            onPress={() => setAccountHealthExpanded((expanded) => !expanded)}
          >
            <View>
              <View className="flex-row items-center gap-2">
                <SymbolView
                  name={{ ios: 'heart.text.square.fill', android: 'health_and_safety', web: 'health_and_safety' }}
                  size={17}
                  tintColor="#f472b6"
                />
                <Text className="font-semibold text-white">Account health</Text>
              </View>
              <Text className="text-xs text-slate-400">
                {accountHealthExpanded ? 'Readiness for competitive seasons' : `${completedHealthCount} of ${healthItems.length} checks ready`}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <AccountHealthProgress completed={completedHealthCount} total={healthItems.length} />
              <Text className="text-lg text-brand-300">
                {accountHealthExpanded ? '⌃' : '⌄'}
              </Text>
            </View>
          </Pressable>
          {accountHealthExpanded
            ? healthItems.map(([itemLabel, complete]) => (
                <HealthRow key={itemLabel} label={itemLabel} complete={complete} />
              ))
            : null}
        </View>
      </View>

      {/* Banner Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.78)' }}>
          <View
            className="w-full max-w-sm rounded-2xl border p-5"
            style={{ backgroundColor: bannerModalColors.panel, borderColor: bannerModalColors.border }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-base font-bold" style={{ color: bannerModalColors.text }}>
                Choose Hero Banner Theme
              </Text>
              <Pressable
                accessibilityLabel="Close hero banner theme picker"
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center rounded-full border p-0"
                onPress={() => setThemeModalVisible(false)}
                style={{ backgroundColor: bannerModalColors.option, borderColor: bannerModalColors.border }}
              >
                <Text
                  className="text-xl"
                  style={{ color: bannerModalColors.text, lineHeight: 24, textAlign: 'center', includeFontPadding: false }}
                >
                  ×
                </Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-xs" style={{ color: bannerModalColors.secondaryText }}>
              Customize your profile banner inspired by Dota hero roles.
            </Text>

            <NativeScrollView className="mt-4" style={{ maxHeight: 390 }} showsVerticalScrollIndicator={false}>
              <View className="gap-2">
              {MOBILE_BANNER_THEMES.map((theme) => {
                const isSelected = theme.id === currentTheme.id;
                return (
                  <Pressable
                    key={theme.id}
                    onPress={() => selectBannerTheme(theme.id)}
                    disabled={bannerMutation.isPending}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: bannerMutation.isPending }}
                    className={`min-w-0 flex-row items-center justify-between rounded-xl border p-3 ${theme.bgClass}`}
                    style={{
                      borderColor: isSelected
                        ? (colorScheme === 'dark' ? '#14b8a6' : '#0f766e')
                        : 'rgba(255, 255, 255, 0.28)',
                    }}
                  >
                    <View className="min-w-0 flex-1 flex-row items-center gap-3">
                      <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-1.5">
                          <Text className="text-sm font-bold" style={{ color: '#ffffff' }}>
                            {theme.name}
                          </Text>
                          <Text
                            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                            style={{ backgroundColor: 'rgba(2, 6, 23, 0.82)', color: '#ffffff' }}
                          >
                            {theme.dotaRole}
                          </Text>
                        </View>
                        <Text className="mt-0.5 text-xs font-medium" style={{ color: '#ffffff' }}>
                          {theme.heroInspiration}
                        </Text>
                        <Text
                          className="mt-1 text-xs leading-4"
                          style={{ color: '#ffffff', flexShrink: 1, flexWrap: 'wrap', width: '100%' }}
                        >
                          {theme.description}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Text className="shrink-0 text-sm font-bold" style={{ color: '#ffffff' }}>
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              })}
              </View>
            </NativeScrollView>

          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProfileAchievementsSection({ profile }: { profile: ManagerProfile }) {
  const fantasyQuery = useFantasyContext();
  const achievements = computeAchievements({
    hasSquad: fantasyQuery.data?.hasSquad ?? false,
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

function ProfileTag({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'sky' | 'violet';
}) {
  const colors = {
    emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    sky: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
    violet: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
  }[tone];
  return (
    <Text className={`rounded-full border px-3 py-1.5 text-xs ${colors}`}>
      <Text className="font-semibold text-white">{label}: </Text>
      {value}
    </Text>
  );
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

function SettingPicker({
  label,
  value,
  options,
  onSelect,
  allowClear = false,
}: {
  label: string;
  value: string;
  options: SettingOption[];
  onSelect: (value: string) => void;
  allowClear?: boolean;
}) {
  const { colors, theme } = useMobileTheme();
  const pickerColors = theme === 'dark'
    ? {
        panel: '#0f172a',
        input: '#020617',
        option: '#1e293b',
        selected: '#134e4a',
        border: '#334155',
        text: '#f8fafc',
        secondaryText: '#cbd5e1',
      }
    : {
        panel: '#ffffff',
        input: '#f1f5f9',
        option: '#e8eef5',
        selected: '#ccfbf1',
        border: '#9fb4c9',
        text: '#0f172a',
        secondaryText: '#334155',
      };
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const currentOption = options.find((option) => option.value === value);
  const availableOptions = [
    ...(allowClear ? [{ value: '', label: 'Not set' }] : []),
    ...(value && !currentOption ? [{ value, label: value, description: 'Current saved value' }] : []),
    ...options,
  ];
  const filteredOptions = availableOptions.filter((option) =>
    `${option.label} ${option.value} ${option.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const displayValue = currentOption?.label ?? (value ? value : 'Select a country');

  function closePicker() {
    setVisible(false);
    setSearch('');
  }

  return (
    <View>
      <Text
        className="mb-2 text-sm font-semibold"
        style={{ color: theme === 'dark' ? '#e2e8f0' : '#1e293b' }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityLabel={`${label}: ${displayValue}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: visible }}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4"
        onPress={() => setVisible(true)}
      >
        <Text className={`flex-1 text-base ${value ? 'text-white' : 'text-slate-400'}`}>{displayValue}</Text>
        <Text className="ml-3 text-lg text-slate-400">⌄</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={closePicker}>
        <View className="flex-1 justify-end bg-black/70">
          <View
            className="rounded-t-3xl border px-5 pb-8 pt-5"
            style={{ maxHeight: '85%', backgroundColor: pickerColors.panel, borderColor: pickerColors.border }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="flex-1 text-lg font-bold" style={{ color: pickerColors.text }}>
                Choose {label.toLowerCase()}
              </Text>
              <Pressable
                accessibilityLabel={`Close ${label.toLowerCase()} picker`}
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full border"
                onPress={closePicker}
                style={{ backgroundColor: pickerColors.option, borderColor: pickerColors.border }}
              >
                <Text className="text-2xl leading-7" style={{ color: pickerColors.text }}>×</Text>
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel={`Search ${label.toLowerCase()}`}
              autoCapitalize="none"
              autoCorrect={false}
              className="min-h-12 rounded-xl border px-4 text-base"
              onChangeText={setSearch}
              placeholder={`Search ${label.toLowerCase()}...`}
              placeholderTextColor={colors.placeholder}
              style={{
                backgroundColor: pickerColors.input,
                borderColor: pickerColors.border,
                color: pickerColors.text,
              }}
              value={search}
            />
            <NativeScrollView className="mt-3" keyboardShouldPersistTaps="handled">
              <View className="gap-1">
                {filteredOptions.map((option) => {
                  const selected = option.value === value;
                  return (
                    <Pressable
                      key={`${option.value}-${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      className="rounded-xl border px-4 py-3"
                      style={{
                        backgroundColor: selected ? pickerColors.selected : pickerColors.option,
                        borderColor: selected ? (theme === 'dark' ? '#14b8a6' : '#0f766e') : pickerColors.border,
                      }}
                      onPress={() => {
                        onSelect(option.value);
                        closePicker();
                      }}
                    >
                      <Text className="font-semibold" style={{ color: pickerColors.text }}>{option.label}</Text>
                      {option.description ? (
                        <Text className="mt-1 text-xs" style={{ color: pickerColors.secondaryText }}>{option.description}</Text>
                      ) : null}
                      {option.value && option.value !== option.label ? (
                        <Text className="mt-0.5 text-xs" style={{ color: pickerColors.secondaryText }}>{option.value}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
                {filteredOptions.length === 0 ? (
                  <Text className="px-3 py-6 text-center text-sm text-slate-400">No matching options.</Text>
                ) : null}
              </View>
            </NativeScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProfileEditor({
  profile,
  onSaved,
}: {
  profile: ManagerProfile;
  onSaved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const { confirm } = useMobileFeedback();
  const { session } = useAuth();
  const pushStatus = usePushNotificationStatus();
  const { theme, setTheme, isSaving: savingTheme } = useMobileTheme();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [countryCode, setCountryCode] = useState(profile.countryCode ?? '');
  const [timezone, setTimezone] = useState(profile.timezone ?? 'UTC');
  const [pushNotifications, setPushNotifications] = useState(profile.pushNotifications);
  const [notice, setNotice] = useState<string | null>(null);
  const [enablingPush, setEnablingPush] = useState(false);
  const [savingPushPreference, setSavingPushPreference] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const save = useMutation({
    mutationFn: updateManagerProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], profile);
      onSaved('Your profile and preferences have been saved.');
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
      pushNotifications,
    });
  }

  async function handlePushPreferenceChange(enabled: boolean) {
    if (save.isPending || savingPushPreference) return;

    const previousValue = pushNotifications;
    setPushNotifications(enabled);
    setSavingPushPreference(true);
    setNotice(null);
    try {
      const updatedProfile = await updatePushNotificationPreference(enabled);
      queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], updatedProfile);
      setPushNotifications(updatedProfile.pushNotifications);
      setNotice(enabled
        ? pushStatus.isDeviceRegistered
          ? 'Push notifications are enabled for your account.'
          : 'Push is enabled for your account. Register this device to receive alerts here.'
        : 'Push notifications are off for your account.');
    } catch (error: unknown) {
      setPushNotifications(previousValue);
      setNotice(error instanceof Error ? error.message : 'Unable to save the push notification preference.');
    } finally {
      setSavingPushPreference(false);
    }
  }

  async function handleThemeChange(nextTheme: 'light' | 'dark') {
    setNotice(null);
    try {
      await setTheme(nextTheme);
      setNotice(`Theme set to ${nextTheme === 'light' ? 'light' : 'dark'} mode.`);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : 'Unable to save the theme preference.');
    }
  }

  async function handleChangeAvatar() {
    setNotice(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice('Allow photo library access to choose a profile image.');
        return;
      }

      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (selection.canceled) return;

      const asset = selection.assets[0];
      if (!asset) throw new Error('No image was selected.');
      if (asset.fileSize !== null && asset.fileSize !== undefined && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('Choose an image that is 5 MB or smaller.');
      }

      const fileExtension = asset.fileName?.split('.').pop()?.toLowerCase();
      const mimeType = asset.mimeType?.toLowerCase() ?? (
        fileExtension === 'jpg' || fileExtension === 'jpeg'
          ? 'image/jpeg'
          : fileExtension === 'png'
            ? 'image/png'
            : fileExtension === 'webp'
              ? 'image/webp'
              : null
      );
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/webp') {
        throw new Error('Choose a JPEG, PNG, or WebP image.');
      }

      setUploadingAvatar(true);
      const { avatarUrl, userId } = await uploadManagerAvatar({
        uri: asset.uri,
        mimeType,
        currentAvatarUrl: profile.avatarUrl,
      });
      const updatedProfile = { ...profile, avatarUrl };
      queryClient.setQueryData<ManagerProfile | null>(['manager-profile'], updatedProfile);
      queryClient.setQueryData(['manager-avatar', userId], avatarUrl);
      setNotice('Your profile image has been updated.');
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : 'Unable to upload profile image.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleEnablePush() {
    void confirm({
      title: 'Enable device notifications?',
      message: 'Fantasy Dota 2 will send generic update alerts. Open the app to view the full notification.',
      cancelLabel: 'Not now',
      confirmLabel: 'Continue',
    }).then((confirmed) => {
      if (!confirmed) return;
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
    });
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
        <View className="flex-row items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-slate-700 bg-slate-800">
            {profile.avatarUrl ? (
              <Image
                accessibilityLabel="Current profile image"
                className="h-full w-full"
                source={{ uri: profile.avatarUrl }}
              />
            ) : (
              <Text className="text-2xl font-bold text-brand-300">
                {(profile.displayName?.trim() || profile.username).slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <View className="flex-1 gap-2">
            <Text className="font-semibold text-white">Profile image</Text>
            <Text className="text-xs leading-4 text-slate-400">JPEG, PNG, or WebP · 5 MB maximum</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: uploadingAvatar }}
              className={`self-start rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 ${uploadingAvatar ? 'opacity-60' : ''}`}
              disabled={uploadingAvatar}
              onPress={() => void handleChangeAvatar()}
            >
              <Text className="text-xs font-semibold text-brand-300">
                {uploadingAvatar ? 'Uploading image...' : profile.avatarUrl ? 'Change image' : 'Add image'}
              </Text>
            </Pressable>
          </View>
        </View>
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
        <SettingPicker
          allowClear
          label="Country or region"
          onSelect={(value) => {
            setCountryCode(value);
            const defaultTimezone = getDefaultTimezoneForCountry(value);
            if (defaultTimezone) setTimezone(defaultTimezone);
          }}
          options={MOBILE_COUNTRY_OPTIONS}
          value={countryCode}
        />
        <Text className="-mt-2 text-xs leading-5 text-slate-400">
          Selecting a country suggests its primary timezone. You can still choose a different timezone below.
        </Text>
        <SettingPicker
          label="Timezone"
          onSelect={setTimezone}
          options={MOBILE_TIMEZONE_OPTIONS}
          value={timezone}
        />
      </View>

      <View className="gap-3 border-t border-slate-800 pt-4">
        <Text className="text-base font-semibold text-white">Account details</Text>
        <View className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sign-in email</Text>
          <Text className="mt-1 text-sm font-medium text-white">{profile.email || 'Email unavailable'}</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-400">
            Email changes are managed through your authenticated account provider.
          </Text>
        </View>
        <Link href="/forgot-password" asChild>
          <Pressable
            accessibilityRole="button"
            className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3"
          >
            <Text className="font-semibold text-brand-300">Reset password</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-400">
              Continue to the secure password recovery page.
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="gap-3 border-t border-slate-800 pt-4">
        <View>
          <Text className="text-base font-semibold text-white">Appearance</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Choose the theme used across the mobile app. Your choice is saved to your account.
          </Text>
        </View>
        <View className="flex-row gap-3">
          {(['light', 'dark'] as const).map((option) => {
            const selected = theme === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: savingTheme }}
                className={`min-h-24 flex-1 justify-between rounded-xl border p-3 ${
                  selected ? 'border-brand-500 bg-brand-950/40' : 'border-slate-700 bg-slate-950/50'
                }`}
                disabled={savingTheme}
                onPress={() => void handleThemeChange(option)}
              >
                <View className={`h-9 rounded-md border ${option === 'light' ? 'border-slate-300 bg-slate-100' : 'border-slate-700 bg-slate-800'}`} />
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="font-semibold capitalize text-white">{option} mode</Text>
                  {selected ? <Text className="text-xs font-bold text-brand-300">Selected</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {savingTheme ? <Text className="text-xs text-slate-400">Saving appearance preference...</Text> : null}
      </View>

      <View className="gap-1 border-t border-slate-800 pt-4">
        <Text className="text-base font-semibold text-white">Preferences & Notifications</Text>
        <PreferenceToggle
          label="Email notifications"
          description="Email delivery is not available yet. Changing this preference will not send emails."
          value={false}
          unavailable
        />
        <PreferenceToggle
          label="Push notifications"
          description="Choose whether supported alerts are sent to your account. Register this iOS or Android device and allow notifications to receive them here."
          value={pushNotifications}
          disabled={savingPushPreference || save.isPending}
          onChange={(enabled) => void handlePushPreferenceChange(enabled)}
        />
        {savingPushPreference ? (
          <Text className="text-xs text-slate-400">Saving push preference...</Text>
        ) : null}
        <Text className={`text-xs leading-5 ${pushStatus.syncError ? 'text-amber-300' : 'text-slate-400'}`}>
          {pushStatus.syncError
            ? `Device registration issue: ${pushStatus.syncError}`
            : pushStatus.isDeviceRegistered
              ? 'This device is registered for push notifications.'
              : pushNotifications
                ? 'Push is enabled for your account, but this device is not registered.'
                : 'Push notifications are off for this account.'}
        </Text>
        {!pushStatus.isDeviceRegistered || !pushNotifications ? (
          <Pressable
            accessibilityRole="button"
            className="mt-2 rounded-xl border border-brand-500/30 bg-brand-500/10 py-3 items-center"
            disabled={enablingPush || savingPushPreference || save.isPending}
            onPress={handleEnablePush}
          >
            <Text className="text-sm font-semibold text-brand-300">
              {enablingPush
                ? 'Registering device...'
                : pushNotifications
                  ? 'Register this device'
                  : 'Enable device push notifications'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Button
        accessibilityLabel="Save profile changes"
        disabled={save.isPending || savingPushPreference}
        label={save.isPending ? 'Saving changes...' : 'Save Profile'}
        onPress={handleSave}
      />
    </View>
  );
}
