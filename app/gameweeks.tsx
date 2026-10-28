import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView as NativeScrollView,
  Text,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { themeVariables, useMobileTheme } from '@/src/lib/theme';
import {
  getGameweekHistory,
  getGameweeks,
  type GameweekHistory,
  type GameweekHistoryPlayer,
  type GameweekSummary,
} from '@/src/features/gameweeks/api';

type Filter = 'all' | 'planning' | 'past';
type DisplayMode = 'detailed' | 'compact';

const DISPLAY_MODE_KEY = 'gameweeks-display-mode';

async function readDisplayMode(): Promise<DisplayMode | null> {
  const saved = Platform.OS === 'web'
    ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(DISPLAY_MODE_KEY))
    : await SecureStore.getItemAsync(DISPLAY_MODE_KEY);
  return saved === 'compact' || saved === 'detailed' ? saved : null;
}

async function writeDisplayMode(mode: DisplayMode): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISPLAY_MODE_KEY, mode);
    return;
  }
  await SecureStore.setItemAsync(DISPLAY_MODE_KEY, mode);
}

function formatDate(value: string | null): string {
  if (!value) return 'TBC';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'TBC'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDeadline(value: string | null): string {
  if (!value) return 'Deadline not announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Deadline not announced'
    : `Deadline ${date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
}

function isPast(gameweek: GameweekSummary): boolean {
  return gameweek.status === 'closed' || gameweek.status === 'locked';
}

export default function GameweeksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('detailed');
  const [displayModeLoaded, setDisplayModeLoaded] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [expandedGameweeks, setExpandedGameweeks] = useState<Set<number>>(() => new Set());
  const [historyGameweek, setHistoryGameweek] = useState<GameweekSummary | null>(null);
  const query = useQuery({
    queryKey: ['gameweeks'],
    queryFn: getGameweeks,
    staleTime: 60_000,
  });
  const historyQuery = useQuery({
    queryKey: ['gameweek-history', historyGameweek?.id],
    queryFn: () => getGameweekHistory(historyGameweek!.id),
    enabled: historyGameweek !== null,
    staleTime: 60_000,
  });

  useEffect(() => {
    let active = true;
    void readDisplayMode()
      .then((savedMode) => {
        if (active && savedMode) setDisplayMode(savedMode);
      })
      .catch((error: unknown) => {
        if (active) {
          setPreferenceError(error instanceof Error ? error.message : 'Unable to load the saved gameweek view.');
        }
      })
      .finally(() => {
        if (active) setDisplayModeLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!displayModeLoaded) return;
    void writeDisplayMode(displayMode)
      .then(() => setPreferenceError(null))
      .catch((error: unknown) => {
        setPreferenceError(error instanceof Error ? error.message : 'Unable to save the gameweek view.');
      });
  }, [displayMode, displayModeLoaded]);

  const activeGameweek = useMemo(
    () => query.data?.find((gameweek) => gameweek.status === 'active')
      ?? query.data?.find((gameweek) => gameweek.status === 'upcoming')
      ?? null,
    [query.data]
  );
  const visibleGameweeks = useMemo(
    () => (query.data ?? []).filter((gameweek) => {
      if (filter === 'planning') return gameweek.status === 'active' || gameweek.status === 'upcoming';
      if (filter === 'past') return isPast(gameweek);
      return true;
    }),
    [filter, query.data]
  );

  function toggleExpanded(gameweekId: number) {
    setExpandedGameweeks((current) => {
      const next = new Set(current);
      if (next.has(gameweekId)) next.delete(gameweekId);
      else next.add(gameweekId);
      return next;
    });
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy schedule</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Gameweeks</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Track deadlines, fixtures, double and blank gameweeks, and completed scores.
          </Text>
          <View className="mt-3">
            <DataFreshnessBadge page="gameweeks" />
          </View>
        </View>

        {activeGameweek ? (
          <View className="gap-2 rounded-2xl border border-cyan-700/60 bg-cyan-950/40 p-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Current planning window</Text>
            <Text className="text-2xl font-bold text-white">Gameweek {activeGameweek.gameweek_number}</Text>
            <Text className="text-sm text-slate-300">
              {activeGameweek.status === 'active' ? 'Active' : 'Upcoming'} · {formatDeadline(activeGameweek.deadline)}
            </Text>
            <Text className="text-sm text-slate-400">{activeGameweek.match_count} scheduled matches</Text>
          </View>
        ) : null}
        <Link href="/squad-planner" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 justify-center rounded-xl border border-cyan-700/60 bg-cyan-950/30 px-4"
          >
            <Text className="font-semibold text-cyan-200">Open my squad planner</Text>
            <Text className="mt-1 text-xs text-slate-400">Availability and upcoming team fixtures</Text>
          </Pressable>
        </Link>

        <View className="gap-3">
          <View className="flex-row gap-2">
            {([
              ['all', 'All'],
              ['planning', 'Planning'],
              ['past', 'Past'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === value }}
                className={`min-h-10 flex-1 items-center justify-center rounded-full border px-3 ${
                  filter === value ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
                }`}
                onPress={() => setFilter(value)}
              >
                <Text className={`text-sm font-semibold ${filter === value ? 'text-brand-300' : 'text-slate-300'}`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-sm font-semibold text-slate-300">Card density</Text>
            <View className="flex-row gap-2">
              {(['detailed', 'compact'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  accessibilityRole="button"
                  accessibilityState={{ selected: displayMode === mode }}
                  className={`min-h-9 justify-center rounded-full border px-3 ${
                    displayMode === mode ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
                  }`}
                  onPress={() => setDisplayMode(mode)}
                >
                  <Text className={`text-xs font-semibold capitalize ${
                    displayMode === mode ? 'text-brand-300' : 'text-slate-300'
                  }`}>
                    {mode}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {preferenceError ? (
            <Text accessibilityRole="alert" className="text-xs leading-5 text-amber-200">
              Gameweek view preference could not be saved or loaded: {preferenceError}
            </Text>
          ) : null}
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading gameweeks" className="gap-3">
            {[1, 2, 3].map((item) => (
              <View key={item} className="h-36 rounded-2xl border border-slate-800 bg-slate-900" />
            ))}
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Gameweeks unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load the gameweek schedule.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : visibleGameweeks.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-sm text-slate-300">
              {query.data?.length ? 'No gameweeks match this filter.' : 'No gameweeks are available yet.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {visibleGameweeks.map((gameweek) => (
              <GameweekCard
                key={gameweek.id}
                gameweek={gameweek}
                displayMode={displayMode}
                expanded={expandedGameweeks.has(gameweek.id)}
                onPress={() => router.push(`/gameweek/${gameweek.id}`)}
                onToggleExpanded={() => toggleExpanded(gameweek.id)}
                onHistory={() => setHistoryGameweek(gameweek)}
                onOpenLineup={() => router.push('/(tabs)/team?tab=lineup')}
                onOpenTransfers={() => router.push('/(tabs)/team?tab=transfers')}
                onOpenRecap={() => router.push('/season-recap')}
                onOpenMatches={() => router.push('/matches')}
              />
            ))}
          </View>
        )}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing gameweeks" color="#14b8a6" /> : null}
      </ScrollView>
      {historyGameweek ? (
        <GameweekHistorySheet
          gameweek={historyGameweek}
          query={historyQuery}
          onClose={() => setHistoryGameweek(null)}
          onRetry={() => void historyQuery.refetch()}
        />
      ) : null}
    </Screen>
  );
}

function GameweekCard({
  gameweek,
  displayMode,
  expanded,
  onPress,
  onToggleExpanded,
  onHistory,
  onOpenLineup,
  onOpenTransfers,
  onOpenRecap,
  onOpenMatches,
}: {
  gameweek: GameweekSummary;
  displayMode: DisplayMode;
  expanded: boolean;
  onPress: () => void;
  onToggleExpanded: () => void;
  onHistory: () => void;
  onOpenLineup: () => void;
  onOpenTransfers: () => void;
  onOpenRecap: () => void;
  onOpenMatches: () => void;
}) {
  const status = gameweek.status.charAt(0).toUpperCase() + gameweek.status.slice(1);
  const doubleTeams = gameweek.flags.filter((flag) => flag.flag === 'double');
  const blankTeams = gameweek.flags.filter((flag) => flag.flag === 'blank');
  const scorerName = gameweek.top_scorer?.in_game_name || gameweek.top_scorer?.name;

  return (
    <View className={`gap-3 rounded-2xl border p-4 ${
      gameweek.status === 'active'
        ? 'border-amber-700/60 bg-amber-950/20'
        : gameweek.status === 'upcoming'
          ? 'border-sky-800/60 bg-sky-950/20'
          : 'border-slate-800 bg-slate-900'
    }`}>
      <View className="flex-row items-start justify-between gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View gameweek ${gameweek.gameweek_number} details`}
          className="min-h-11 flex-1 justify-center"
          onPress={onPress}
        >
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Gameweek {gameweek.gameweek_number}
          </Text>
          <Text className="mt-1 text-xl font-bold text-white">{status}</Text>
        </Pressable>
        <Text className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
          {gameweek.match_count} matches
        </Text>
      </View>

      {displayMode === 'detailed' ? (
        <>
          <Text className="text-sm text-slate-300">
            {formatDate(gameweek.start_date)} – {formatDate(gameweek.end_date)}
          </Text>
          <Text className="text-sm text-slate-400">{formatDeadline(gameweek.deadline)}</Text>
          {(doubleTeams.length > 0 || blankTeams.length > 0) ? (
            <View className="gap-2">
              {doubleTeams.length > 0 ? (
                <View className="gap-2">
                  <ScheduleBadge label={`Double GW · ${doubleTeams.length} ${doubleTeams.length === 1 ? 'team' : 'teams'}`} tone="amber" />
                  <Text className="text-xs leading-5 text-amber-100/80">
                    {doubleTeams.map((flag) => flag.team_name).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {blankTeams.length > 0 ? (
                <View className="gap-2">
                  <ScheduleBadge label={`Blank GW · ${blankTeams.length} ${blankTeams.length === 1 ? 'team' : 'teams'}`} tone="orange" />
                  <Text className="text-xs leading-5 text-orange-100/80">
                    {blankTeams.map((flag) => flag.team_name).join(' · ')}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {gameweek.tournaments.length > 0 ? (
            <Text numberOfLines={2} className="text-xs leading-5 text-slate-400">
              {gameweek.tournaments.map((tournament) => tournament.name).join(' · ')}
            </Text>
          ) : null}
        </>
      ) : (
        <Text className="text-sm text-slate-400">
          {formatDate(gameweek.start_date)} – {formatDate(gameweek.end_date)}
          {isPast(gameweek) && gameweek.user_score !== null ? ` · ${gameweek.user_score.toFixed(1)} pts` : ''}
        </Text>
      )}

      {isPast(gameweek) ? (
        <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-slate-700 pt-3">
          {gameweek.user_score !== null ? (
            <Text className="text-sm font-semibold text-emerald-300">Your score · {gameweek.user_score.toFixed(1)} pts</Text>
          ) : <View />}
          {scorerName ? (
            <Text className="text-xs text-slate-400">
              Top scorer · {scorerName} ({gameweek.top_scorer?.total_points.toFixed(1)} pts)
            </Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="min-h-10 justify-center border-t border-slate-700 pt-2"
        onPress={onToggleExpanded}
      >
        <Text className="text-sm font-semibold text-cyan-300">{expanded ? 'Hide quick actions' : 'Show quick actions'}</Text>
      </Pressable>
      {expanded ? (
        <View className="flex-row flex-wrap gap-2">
          <QuickAction label={isPast(gameweek) ? 'View results' : 'View fixtures'} onPress={onPress} />
          <QuickAction label="Match center" onPress={onOpenMatches} />
          <QuickAction label="Lineup" onPress={onOpenLineup} />
          <QuickAction label="Transfers" onPress={onOpenTransfers} />
          {isPast(gameweek) ? <QuickAction label="Your score & lineup" onPress={onHistory} /> : null}
          <QuickAction label="Season recap" onPress={onOpenRecap} />
        </View>
      ) : null}
    </View>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-10 justify-center rounded-full border border-slate-700 bg-slate-950/60 px-3"
      onPress={onPress}
    >
      <Text className="text-xs font-semibold text-slate-200">{label}</Text>
    </Pressable>
  );
}

function GameweekHistorySheet({
  gameweek,
  query,
  onClose,
  onRetry,
}: {
  gameweek: GameweekSummary;
  query: { data?: GameweekHistory; isPending: boolean; isError: boolean; error: Error | null };
  onClose: () => void;
  onRetry: () => void;
}) {
  const history = query.data;
  const insets = useSafeAreaInsets();
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      visible
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        className="flex-1 justify-end"
        style={[
          themeVariables[theme],
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: isDark ? 'rgba(2, 6, 23, 0.82)' : 'rgba(15, 23, 42, 0.55)',
          },
        ]}
      >
        <View
          className="w-full rounded-t-3xl border border-slate-700 bg-slate-900 px-5 pt-5"
          style={{
            maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, 20),
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: isDark ? '#334155' : '#cbd5e1',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <View className="flex-row items-start justify-between gap-4 border-b border-slate-700 pb-4">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Your gameweek</Text>
              <Text accessibilityRole="header" className="mt-1 text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                Gameweek {gameweek.gameweek_number} History
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close gameweek history"
              className="min-h-10 min-w-10 items-center justify-center rounded-full bg-slate-800"
              style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}
              onPress={onClose}
            >
              <Text className="text-lg font-semibold" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>×</Text>
            </Pressable>
          </View>
          <NativeScrollView
            className="mt-4"
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerClassName="gap-5 pb-4"
            showsVerticalScrollIndicator={false}
          >
            {query.isPending ? (
              <View accessibilityLabel="Loading gameweek history" className="items-center py-10">
                <ActivityIndicator color="#14b8a6" />
              </View>
            ) : query.isError ? (
              <View accessibilityRole="alert" className="gap-3 rounded-xl border border-red-900 bg-red-950 p-4">
                <Text className="text-sm leading-5 text-red-200">
                  {query.error?.message ?? 'Unable to load gameweek history.'}
                </Text>
                <Pressable accessibilityRole="button" onPress={onRetry}>
                  <Text className="font-semibold text-white">Try again</Text>
                </Pressable>
              </View>
            ) : history ? (
              <>
                <View className="flex-row gap-3">
                    <HistoryStat label="Your score" value={history.managerScore === null ? '—' : `${history.managerScore.toFixed(1)} pts`} tone="green" isDark={isDark} />
                    <HistoryStat label="Global average" value={history.globalAverage === null ? '—' : `${history.globalAverage.toFixed(1)} pts`} isDark={isDark} />
                </View>
                {history.managerScore !== null && history.globalAverage !== null ? (
                  <Text className={`text-xs ${
                    history.managerScore >= history.globalAverage ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    {history.managerScore >= history.globalAverage ? '+' : ''}
                    {(history.managerScore - history.globalAverage).toFixed(1)} pts vs average
                  </Text>
                ) : null}
                {history.starters.length === 0 && history.bench.length === 0 ? (
                  <Text className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No saved lineup was found for this gameweek.
                  </Text>
                ) : (
                  <>
                    <View>
                      <Text className="text-sm font-semibold uppercase tracking-wider text-slate-300">Starting 5</Text>
                      <Text className="mb-1 mt-1 text-xs leading-5 text-slate-500">
                        Player rows show base points; captain and chip multipliers are included in your total score.
                      </Text>
                      <HistoryPlayers players={history.starters} emptyMessage="No starting players saved." isDark={isDark} />
                    </View>
                    <View>
                      <Text className="text-sm font-semibold uppercase tracking-wider text-slate-300">Bench</Text>
                      <HistoryPlayers players={history.bench} emptyMessage="No bench players saved." isDark={isDark} />
                    </View>
                  </>
                )}
              </>
            ) : null}
          </NativeScrollView>
        </View>
      </View>
    </Modal>
  );
}

function HistoryStat({ label, value, tone, isDark }: { label: string; value: string; tone?: 'green'; isDark: boolean }) {
  const accent = tone === 'green';
  return (
    <View className={`flex-1 gap-1 rounded-xl border p-4 ${
      tone === 'green' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 bg-slate-950/40'
    }`} style={{
      backgroundColor: accent
        ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5')
        : (isDark ? 'rgba(2, 6, 23, 0.4)' : '#f8fafc'),
      borderColor: accent
        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#a7f3d0')
        : (isDark ? '#334155' : '#cbd5e1'),
    }}>
      <Text className="text-xs uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{label}</Text>
      <Text className="text-xl font-bold" style={{ color: accent ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#f8fafc' : '#0f172a') }}>{value}</Text>
    </View>
  );
}

function HistoryPlayers({ players, emptyMessage, isDark }: { players: GameweekHistoryPlayer[]; emptyMessage: string; isDark: boolean }) {
  if (!players.length) return <Text className="py-3 text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{emptyMessage}</Text>;

  const priority = (player: GameweekHistoryPlayer) =>
    player.isCaptain ? 0 : player.isViceCaptain ? 1 : 2;
  const orderedPlayers = players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      return priority(a.player) - priority(b.player) || a.index - b.index;
    })
    .map(({ player }) => player);

  return (
    <View className="divide-y divide-slate-800">
      {orderedPlayers.map((player) => (
        <View key={`${player.role}-${player.id}`} className="flex-row items-center gap-3 border-b py-3" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
        <View className="h-11 w-11 overflow-hidden rounded-xl" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            {player.profileImageUrl ? (
              <Image source={{ uri: player.profileImageUrl }} className="h-full w-full" accessibilityLabel={`${player.name} avatar`} />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="font-bold" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>{player.name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-medium" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{player.name}</Text>
            <Text className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{player.role}</Text>
            <View className="mt-1 flex-row flex-wrap gap-1">
              {player.isCaptain ? <Text className="text-[10px] font-bold uppercase text-amber-300">Captain</Text> : null}
              {player.isViceCaptain ? <Text className="text-[10px] font-bold uppercase text-sky-300">Vice</Text> : null}
            </View>
          </View>
          <Text className="text-sm font-semibold text-emerald-300">{player.points.toFixed(1)} pts</Text>
        </View>
      ))}
    </View>
  );
}

function ScheduleBadge({ label, tone }: { label: string; tone: 'amber' | 'orange' }) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${tone === 'amber' ? 'bg-amber-500/15' : 'bg-orange-500/15'}`}>
      <Text className={`text-xs font-semibold ${tone === 'amber' ? 'text-amber-300' : 'text-orange-300'}`}>
        {label}
      </Text>
    </View>
  );
}
