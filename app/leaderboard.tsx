import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView as NativeScrollView,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { getGameweeks } from '@/src/features/gameweeks/api';
import { getLeaderboard, getLeaderboardCountries, type LeaderboardEntry } from '@/src/features/leaderboard/api';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

const PAGE_SIZE = 50;

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Update time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Update time unavailable' : `Updated ${date.toLocaleString()}`;
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((character) => 127397 + character.charCodeAt(0)));
}

export default function LeaderboardScreen() {
  const { session } = useAuth();
  const { theme } = useMobileTheme();
  const modalColors = theme === 'dark'
    ? {
        backdrop: 'rgba(0, 0, 0, 0.6)',
        surface: '#020617',
        card: '#0f172a',
        border: '#334155',
        text: '#f8fafc',
        secondary: '#cbd5e1',
        muted: '#94a3b8',
        accent: '#2dd4bf',
        selected: '#042f2e',
      }
    : {
        backdrop: 'rgba(15, 23, 42, 0.3)',
        surface: '#e8eef5',
        card: '#f8fafc',
        border: '#cbd5e1',
        text: '#334d64',
        secondary: '#334155',
        muted: '#475569',
        accent: '#0d9488',
        selected: '#ccfbf1',
      };
  const [page, setPage] = useState(1);
  const [gameweekId, setGameweekId] = useState<number | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [gameweekPickerVisible, setGameweekPickerVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedManager, setSelectedManager] = useState<LeaderboardEntry | null>(null);
  const gameweeks = useQuery({
    queryKey: ['gameweeks'],
    queryFn: getGameweeks,
    staleTime: 60_000,
  });
  const countries = useQuery({
    queryKey: ['leaderboard-countries'],
    queryFn: getLeaderboardCountries,
    staleTime: 10 * 60_000,
  });
  const leaderboard = useQuery({
    queryKey: ['leaderboard', countryCode, gameweekId, page],
    queryFn: () => getLeaderboard({ gameweekId, page, countryCode }),
    staleTime: 60_000,
  });
  const totalPages = leaderboard.data ? Math.max(1, Math.ceil(leaderboard.data.total / PAGE_SIZE)) : 1;

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={leaderboard.isRefetching || gameweeks.isRefetching}
            onRefresh={() => {
              void leaderboard.refetch();
              void gameweeks.refetch();
            }}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Global rankings</Text>
          <Text className="mt-2 text-3xl font-bold text-slate-50">Leaderboard</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Compare season totals or select a gameweek to view its standings.
          </Text>
          <View className="mt-3">
            <DataFreshnessBadge page="leaderboard" />
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              size={16}
              tintColor="#2dd4bf"
              accessibilityLabel="Gameweek"
            />
            <Text className="text-sm font-semibold text-slate-300">Gameweek</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Gameweek filter: ${gameweekId === null
              ? 'Overall'
              : `Gameweek ${gameweeks.data?.find((week) => week.id === gameweekId)?.gameweek_number ?? ''}`}`}
            accessibilityState={{ expanded: gameweekPickerVisible }}
            className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4"
            onPress={() => setGameweekPickerVisible(true)}
          >
            <Text className="font-semibold text-slate-50">
              {gameweekId === null
                ? 'Overall'
                : `Gameweek ${gameweeks.data?.find((week) => week.id === gameweekId)?.gameweek_number ?? ''}`}
            </Text>
            <Text className="text-slate-400">Choose ▾</Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={{ ios: 'globe', android: 'public', web: 'public' }}
              size={16}
              tintColor="#2dd4bf"
              accessibilityLabel="Country"
            />
            <Text className="text-sm font-semibold text-slate-300">Country</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Country filter: ${countryCode ? countryName(countryCode) : 'Global'}`}
            accessibilityState={{ expanded: countryPickerVisible }}
            className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4"
            onPress={() => setCountryPickerVisible(true)}
          >
            <Text className="font-semibold text-slate-50">
              {countryCode ? `${countryFlag(countryCode)} ${countryName(countryCode)}` : 'Global (All)'}
            </Text>
            <Text className="text-slate-400">Choose ▾</Text>
          </Pressable>
          {countries.isError ? (
            <View className="flex-row items-center justify-between gap-3">
              <Text accessibilityRole="alert" className="flex-1 text-xs text-amber-300">
                Country options could not be loaded.
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void countries.refetch()}>
                <Text className="text-xs font-semibold text-brand-300">Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {gameweeks.isError ? (
          <Text accessibilityRole="alert" className="text-sm text-amber-300">
            Gameweek filters could not be loaded. The overall leaderboard is still available.
          </Text>
        ) : null}

        {leaderboard.isPending ? (
          <View accessibilityLabel="Loading leaderboard" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : leaderboard.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Leaderboard unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {leaderboard.error instanceof Error ? leaderboard.error.message : 'Unable to load rankings.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void leaderboard.refetch()}>
              <Text className="font-semibold text-slate-50">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="gap-1">
              <Text className="text-sm text-slate-300">
                {leaderboard.data.total} {countryCode ? `${countryName(countryCode)} ` : ''}managers
              </Text>
              <Text className="text-xs text-slate-500">{formatUpdatedAt(leaderboard.data.lastRecalculatedAt)}</Text>
            </View>
            {page === 1 && leaderboard.data.entries.length ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <SymbolView
                    name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
                    size={18}
                    tintColor="#fbbf24"
                    accessibilityLabel="Top managers"
                  />
                  <Text className="text-lg font-bold text-slate-50">Top managers</Text>
                </View>
                <View className="flex-row gap-2">
                  {leaderboard.data.entries.slice(0, 3).map((entry, index) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View rank ${entry.rank}, ${entry.fantasyTeam.managerName}`}
                      className={`min-h-28 flex-1 items-center justify-center gap-1 rounded-xl border p-3 ${
                        index === 0
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                      key={entry.id}
                      onPress={() => setSelectedManager(entry)}
                    >
                      <Text className={`text-xs font-bold uppercase ${index === 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                        {index === 0 ? '1st · Crown' : index === 1 ? '2nd · Medal' : '3rd · Medal'}
                      </Text>
                      <Text numberOfLines={1} className="max-w-full text-center font-semibold text-slate-50">
                        {entry.fantasyTeam.managerName}
                      </Text>
                      <Text className="text-sm font-bold text-brand-300">{entry.totalPoints} pts</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {(() => {
              const currentManager = leaderboard.data.currentUserEntry
                ?? leaderboard.data.entries.find((entry) => entry.fantasyTeam.userId === session?.user.id)
                ?? null;
              if (!currentManager) return null;
              const managerAbove = leaderboard.data.entries
                .filter((entry) => entry.rank === currentManager.rank - 1)
                .sort((a, b) => a.rank - b.rank)[0];
              return (
                <View className="gap-1 rounded-xl border border-brand-500/50 bg-brand-500/10 p-4">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                    Your {countryCode ? `${countryName(countryCode)} ` : 'global '}position
                  </Text>
                  <Text className="font-bold text-slate-50">Rank #{currentManager.rank} · {currentManager.totalPoints} points</Text>
                  <Text className="text-sm text-slate-300">
                    {managerAbove
                      ? `${Math.max(0, managerAbove.totalPoints - currentManager.totalPoints)} points to pass #${managerAbove.rank}`
                      : 'Your rank and points are highlighted in the standings below.'}
                  </Text>
                </View>
              );
            })()}
            {leaderboard.data.topGameweekScorer ? (
              <View className="flex-row items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <Text className="text-xl text-amber-300" accessibilityLabel="Star">★</Text>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Top gameweek scorer</Text>
                  <Text className="mt-1 font-semibold text-slate-50">
                    {leaderboard.data.topGameweekScorer.manager}
                    <Text className="text-amber-200"> · {leaderboard.data.topGameweekScorer.points} pts</Text>
                  </Text>
                </View>
              </View>
            ) : null}
            {leaderboard.data.entries.length ? (
              <View className="gap-2">
                {leaderboard.data.entries.map((entry) => {
                  const isCurrentUser = entry.fantasyTeam.userId === session?.user.id;
                  const isTopScorer = entry.fantasyTeam.id === leaderboard.data.topGameweekScorer?.fantasySeasonId;
                  const rankMovement = entry.previousRank === null
                    ? 'No previous rank'
                    : entry.previousRank > entry.rank
                      ? `Up ${entry.previousRank - entry.rank} places`
                      : entry.previousRank < entry.rank
                        ? `Down ${entry.rank - entry.previousRank} places`
                        : 'No rank change';
                  return (
                    <View
                      key={`${entry.id}-${entry.rank}`}
                      className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                        isTopScorer
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : isCurrentUser ? 'border-brand-500/60 bg-brand-500/10' : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <Text className="w-9 text-center text-base font-bold text-amber-300">#{entry.rank}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${entry.fantasyTeam.managerName} manager details`}
                        className="flex-1"
                        onPress={() => setSelectedManager(entry)}
                      >
                        <Text className={`font-semibold ${isTopScorer ? 'text-amber-200' : isCurrentUser ? 'text-brand-200' : 'text-slate-50'}`}>
                          {entry.fantasyTeam.name}{isCurrentUser ? ' · You' : ''}
                        </Text>
                        <Text className="mt-1 text-xs text-slate-400" accessibilityLabel={`Rank movement: ${rankMovement}`}>
                          {entry.previousRank === null
                            ? '—'
                            : entry.previousRank > entry.rank
                              ? `↑ ${entry.previousRank - entry.rank}`
                              : entry.previousRank < entry.rank
                                ? `↓ ${entry.rank - entry.previousRank}`
                                : '—'}
                          {entry.isPinned ? ' · Your rank' : ''}
                          {isTopScorer ? ' · ★ Top scorer' : ''}
                        </Text>
                        {entry.fantasyTeam.username ? (
                          <Text className="mt-1 text-xs text-slate-500">@{entry.fantasyTeam.username}</Text>
                        ) : null}
                        {entry.fantasyTeam.countryCode ? (
                          <Text className="mt-1 text-xs text-slate-400">
                            {countryFlag(entry.fantasyTeam.countryCode)} {countryName(entry.fantasyTeam.countryCode)}
                          </Text>
                        ) : null}
                      </Pressable>
                      <View className="items-end">
                        <Text className="font-bold text-slate-50">{entry.totalPoints}</Text>
                        <Text className="text-xs text-slate-500">{entry.gameweekPoints} GW</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
                <Text className="text-center text-sm text-slate-300">No rankings are available for this selection yet.</Text>
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: page <= 1 }}
                className={`min-h-11 justify-center rounded-xl border border-slate-700 px-4 ${page <= 1 ? 'opacity-40' : 'bg-slate-900'}`}
                disabled={page <= 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              >
                <Text className="font-semibold text-slate-50">Previous</Text>
              </Pressable>
              <Text className="text-sm text-slate-400">Page {page} of {totalPages}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: page >= totalPages }}
                className={`min-h-11 justify-center rounded-xl border border-slate-700 px-4 ${page >= totalPages ? 'opacity-40' : 'bg-slate-900'}`}
                disabled={page >= totalPages}
                onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                <Text className="font-semibold text-slate-50">Next</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setGameweekPickerVisible(false);
          setCountryPickerVisible(false);
          setSelectedManager(null);
        }}
        transparent
        visible={gameweekPickerVisible || countryPickerVisible || selectedManager !== null}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: modalColors.backdrop }}>
          {gameweekPickerVisible ? (
            <View
              className="gap-3 rounded-t-3xl border p-5"
              style={{
                backgroundColor: modalColors.surface,
                borderColor: modalColors.border,
                maxHeight: '80%',
              }}
            >
              <View className="mb-1 items-center">
                <View className="h-1 w-10 rounded-full" style={{ backgroundColor: modalColors.border }} />
              </View>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold" style={{ color: modalColors.text }}>Choose gameweek</Text>
                  <Text className="mt-1 text-xs" style={{ color: modalColors.muted }}>
                    Upcoming gameweeks unlock when they begin
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close gameweek picker"
                  className="h-10 w-10 items-center justify-center rounded-full border"
                  style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  onPress={() => setGameweekPickerVisible(false)}
                >
                  <Text className="text-xl" style={{ color: modalColors.secondary }}>×</Text>
                </Pressable>
              </View>
              <NativeScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: gameweekId === null }}
                    className="min-h-12 flex-row items-center justify-between rounded-xl border-b px-3"
                    style={{
                      backgroundColor: gameweekId === null ? modalColors.selected : 'transparent',
                      borderColor: modalColors.border,
                    }}
                    onPress={() => {
                      setGameweekId(null);
                      setPage(1);
                      setGameweekPickerVisible(false);
                    }}
                  >
                    <Text className="font-semibold" style={{ color: modalColors.text }}>Overall</Text>
                    {gameweekId === null ? (
                      <Text className="font-bold" style={{ color: modalColors.accent }}>✓</Text>
                    ) : null}
                  </Pressable>
                  {(gameweeks.data ?? []).map((gameweek) => {
                    const isUpcoming = gameweek.status === 'upcoming';
                    const isSelected = gameweekId === gameweek.id;
                    return (
                      <Pressable
                        key={gameweek.id}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isUpcoming, selected: isSelected }}
                        accessibilityHint={isUpcoming ? 'Available when this gameweek begins.' : undefined}
                        className={`min-h-12 flex-row items-center justify-between rounded-xl border-b px-3 ${isUpcoming ? 'opacity-50' : ''}`}
                        disabled={isUpcoming}
                        style={{
                          backgroundColor: isSelected ? modalColors.selected : 'transparent',
                          borderColor: modalColors.border,
                        }}
                        onPress={() => {
                          setGameweekId(gameweek.id);
                          setPage(1);
                          setGameweekPickerVisible(false);
                        }}
                      >
                        <Text
                          className="font-semibold"
                          style={{ color: isUpcoming ? modalColors.muted : modalColors.text }}
                        >
                          Gameweek {gameweek.gameweek_number}{isUpcoming ? ' · Upcoming' : ''}
                        </Text>
                        {isSelected ? (
                          <Text className="font-bold" style={{ color: modalColors.accent }}>✓</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </NativeScrollView>
            </View>
          ) : countryPickerVisible ? (
            <View
              className="gap-3 rounded-t-3xl border p-5"
              style={{
                backgroundColor: modalColors.surface,
                borderColor: modalColors.border,
                maxHeight: '80%',
              }}
            >
              <View className="mb-1 items-center">
                <View className="h-1 w-10 rounded-full" style={{ backgroundColor: modalColors.border }} />
              </View>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold" style={{ color: modalColors.text }}>Choose country</Text>
                  <Text className="mt-1 text-xs" style={{ color: modalColors.muted }}>
                    Filter manager standings by country
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close country picker"
                  className="h-10 w-10 items-center justify-center rounded-full border"
                  style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  onPress={() => setCountryPickerVisible(false)}
                >
                  <Text className="text-xl" style={{ color: modalColors.secondary }}>×</Text>
                </Pressable>
              </View>
              <ScrollView
                className="flex-shrink"
                contentContainerClassName="gap-1"
                style={{ flexShrink: 1 }}
              >
                {countries.isPending ? (
                  <ActivityIndicator accessibilityLabel="Loading countries" color="#14b8a6" />
                ) : countries.isError ? (
                  <Pressable accessibilityRole="button" onPress={() => void countries.refetch()}>
                    <Text accessibilityRole="alert" className="py-3 text-sm" style={{ color: '#b45309' }}>
                      Could not load countries. Tap to retry.
                    </Text>
                  </Pressable>
                ) : countries.data?.length === 0 ? (
                  <Text className="py-3 text-sm" style={{ color: modalColors.muted }}>
                    No country filters are available.
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: countryCode === null }}
                  className="min-h-12 flex-row items-center justify-between rounded-xl border-b px-3"
                  style={{
                    backgroundColor: countryCode === null ? modalColors.selected : 'transparent',
                    borderColor: modalColors.border,
                  }}
                  onPress={() => {
                    setCountryCode(null);
                    setPage(1);
                    setCountryPickerVisible(false);
                  }}
                >
                  <Text className="font-semibold" style={{ color: modalColors.text }}>Global (All)</Text>
                  {countryCode === null ? (
                    <Text className="font-bold" style={{ color: modalColors.accent }}>✓</Text>
                  ) : null}
                </Pressable>
                {(countries.data ?? []).map((code) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: countryCode === code }}
                    className="min-h-12 flex-row items-center justify-between rounded-xl border-b px-3"
                    key={code}
                    style={{
                      backgroundColor: countryCode === code ? modalColors.selected : 'transparent',
                      borderColor: modalColors.border,
                    }}
                    onPress={() => {
                      setCountryCode(code);
                      setPage(1);
                      setCountryPickerVisible(false);
                    }}
                  >
                    <Text className="font-semibold" style={{ color: modalColors.text }}>
                      {countryFlag(code)} {countryName(code)}
                    </Text>
                    {countryCode === code ? (
                      <Text className="font-bold" style={{ color: modalColors.accent }}>✓</Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : selectedManager ? (
            <View
              className="max-h-[80%] rounded-t-3xl border px-5 pb-8 pt-3"
              style={{
                backgroundColor: modalColors.surface,
                borderColor: modalColors.border,
                maxHeight: '80%',
              }}
            >
              <View className="mb-4 items-center">
                <View className="h-1 w-10 rounded-full" style={{ backgroundColor: modalColors.border }} />
              </View>
              <NativeScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-5 pb-2">
                  <View className="flex-row items-center justify-between gap-3">
                    <View>
                      <Text
                        className="text-xs font-bold uppercase tracking-[2px]"
                        style={{ color: modalColors.accent }}
                      >
                        Manager profile
                      </Text>
                      <Text className="mt-1 text-sm" style={{ color: modalColors.muted }}>
                        Global leaderboard
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close manager profile"
                      className="h-10 w-10 items-center justify-center rounded-full border"
                      style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                      onPress={() => setSelectedManager(null)}
                    >
                      <Text className="text-xl" style={{ color: modalColors.secondary }}>×</Text>
                    </Pressable>
                  </View>

                  <View
                    className="flex-row items-center gap-4 rounded-2xl border p-4"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  >
                    {selectedManager.fantasyTeam.avatarUrl ? (
                      <Image
                        accessibilityLabel={`${selectedManager.fantasyTeam.managerName} profile image`}
                        className="h-20 w-20 rounded-full"
                        source={{ uri: selectedManager.fantasyTeam.avatarUrl }}
                      />
                    ) : (
                      <View
                        className="h-20 w-20 items-center justify-center rounded-full"
                        style={{ backgroundColor: modalColors.selected }}
                      >
                        <Text className="text-3xl font-bold" style={{ color: modalColors.accent }}>
                          {selectedManager.fantasyTeam.managerName.trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1 gap-1">
                      <Text className="text-xl font-bold" style={{ color: modalColors.text }}>
                        {selectedManager.fantasyTeam.managerName}
                      </Text>
                      {selectedManager.fantasyTeam.username ? (
                        <Text className="text-sm" style={{ color: modalColors.muted }}>
                          @{selectedManager.fantasyTeam.username}
                        </Text>
                      ) : null}
                      {selectedManager.fantasyTeam.countryCode ? (
                        <Text className="mt-1 text-sm" style={{ color: modalColors.secondary }}>
                          {countryFlag(selectedManager.fantasyTeam.countryCode)}{' '}
                          {countryName(selectedManager.fantasyTeam.countryCode)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    {[
                      { label: 'GLOBAL RANK', value: `#${selectedManager.rank}` },
                      { label: 'TOTAL POINTS', value: selectedManager.totalPoints.toLocaleString() },
                    ].map((stat) => (
                      <View
                        className="min-h-24 flex-1 justify-center gap-1 rounded-2xl border px-4 py-3"
                        key={stat.label}
                        style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                      >
                        <Text className="text-[10px] font-bold tracking-wider" style={{ color: modalColors.muted }}>
                          {stat.label}
                        </Text>
                        <Text className="text-2xl font-bold" style={{ color: modalColors.text }}>
                          {stat.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View
                    className="flex-row items-center justify-between rounded-2xl border px-4 py-3"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: modalColors.secondary }}>
                      Gameweek points
                    </Text>
                    <Text className="text-lg font-bold" style={{ color: modalColors.accent }}>
                      {selectedManager.gameweekPoints.toLocaleString()} pts
                    </Text>
                  </View>

                  {selectedManager.fantasyTeam.bio ? (
                    <View
                      className="gap-2 rounded-2xl border p-4"
                      style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                    >
                      <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: modalColors.muted }}>
                        About
                      </Text>
                      <Text className="text-sm leading-5" style={{ color: modalColors.secondary }}>
                        {selectedManager.fantasyTeam.bio}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </NativeScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}
