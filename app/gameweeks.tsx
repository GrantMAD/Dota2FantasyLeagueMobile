import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { getGameweeks, type GameweekSummary } from '@/src/features/gameweeks/api';

type Filter = 'all' | 'planning' | 'past';

function formatDate(value: string | null): string {
  if (!value) return 'TBC';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'TBC'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
      })}`;
}

function isPast(gameweek: GameweekSummary): boolean {
  return gameweek.status === 'closed' || gameweek.status === 'locked';
}

export default function GameweeksScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const query = useQuery({
    queryKey: ['gameweeks'],
    queryFn: getGameweeks,
    staleTime: 60_000,
  });
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

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor="#fb923c"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy schedule</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Gameweeks</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Track deadlines, fixtures, double and blank gameweeks, and completed scores.
          </Text>
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
              <GameweekCard key={gameweek.id} gameweek={gameweek} />
            ))}
          </View>
        )}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing gameweeks" color="#fb923c" /> : null}
      </ScrollView>
    </Screen>
  );
}

function GameweekCard({ gameweek }: { gameweek: GameweekSummary }) {
  const status = gameweek.status.charAt(0).toUpperCase() + gameweek.status.slice(1);
  const doubleTeams = gameweek.flags.filter((flag) => flag.flag === 'double').length;
  const blankTeams = gameweek.flags.filter((flag) => flag.flag === 'blank').length;
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
        <View>
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Gameweek {gameweek.gameweek_number}
          </Text>
          <Text className="mt-1 text-xl font-bold text-white">{status}</Text>
        </View>
        <Text className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
          {gameweek.match_count} matches
        </Text>
      </View>

      <Text className="text-sm text-slate-300">
        {formatDate(gameweek.start_date)} – {formatDate(gameweek.end_date)}
      </Text>
      <Text className="text-sm text-slate-400">{formatDeadline(gameweek.deadline)}</Text>

      {doubleTeams > 0 || blankTeams > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {doubleTeams > 0 ? <ScheduleBadge label={`Double GW · ${doubleTeams} teams`} tone="amber" /> : null}
          {blankTeams > 0 ? <ScheduleBadge label={`Blank GW · ${blankTeams} teams`} tone="orange" /> : null}
        </View>
      ) : null}

      {gameweek.tournaments.length > 0 ? (
        <Text numberOfLines={2} className="text-xs leading-5 text-slate-400">
          {gameweek.tournaments.map((tournament) => tournament.name).join(' · ')}
        </Text>
      ) : null}

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
    </View>
  );
}

function ScheduleBadge({ label, tone }: { label: string; tone: 'amber' | 'orange' }) {
  return (
    <View className={`rounded-full px-3 py-1 ${tone === 'amber' ? 'bg-amber-500/15' : 'bg-orange-500/15'}`}>
      <Text className={`text-xs font-semibold ${tone === 'amber' ? 'text-amber-300' : 'text-orange-300'}`}>
        {label}
      </Text>
    </View>
  );
}
