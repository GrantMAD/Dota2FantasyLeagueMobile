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
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/src/components/Screen';
import { getLeague, getLeagueActivity, type LeagueFixture, type LeagueStanding } from '@/src/features/leagues/api';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { theme } = useMobileTheme();
  const modalTextColors = theme === 'dark'
    ? { accent: '#2dd4bf', primary: '#f8fafc', secondary: '#cbd5e1', muted: '#94a3b8' }
    : { accent: '#0d9488', primary: '#334d64', secondary: '#334155', muted: '#475569' };
  const modalColors = theme === 'dark'
    ? { surface: '#020617', card: '#0f172a', border: '#334155', accentSurface: '#042f2e' }
    : { surface: '#e8eef5', card: '#f8fafc', border: '#cbd5e1', accentSurface: '#ccfbf1' };
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<LeagueStanding | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<LeagueFixture | null>(null);
  const leagueId = Number(id);
  const validId = Number.isInteger(leagueId) && leagueId > 0;
  const query = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!validId) return null;
      return getLeague(leagueId);
    },
    enabled: validId,
    staleTime: 60_000,
  });
  const activityQuery = useQuery({
    queryKey: ['league-activity', leagueId],
    queryFn: () => getLeagueActivity(leagueId),
    enabled: validId && Boolean(query.data),
    staleTime: 30_000,
  });
  const league = query.data;
  const standings = [...(league?.standings ?? [])].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return b.points - a.points;
  });

  async function copyInviteCode() {
    if (!league?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(league.inviteCode);
      setCopiedInvite(true);
      setCopyError(null);
    } catch (error) {
      setCopyError(error instanceof Error ? `Unable to copy invite code: ${error.message}` : 'Unable to copy invite code.');
    }
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching || activityQuery.isRefetching}
            onRefresh={() => {
              void query.refetch();
              if (league) void activityQuery.refetch();
            }}
            tintColor="#14b8a6"
          />
        }
      >
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="font-semibold text-cyan-300">‹ Back to leagues</Text>
        </Pressable>
        {!validId ? (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-lg font-semibold text-slate-50">League not found</Text>
            <Text className="text-sm text-slate-400">The league link is not valid.</Text>
          </View>
        ) : query.isPending ? (
          <View accessibilityLabel="Loading league" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">League unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load this league.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-slate-50">Try again</Text>
            </Pressable>
          </View>
        ) : !league ? (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-lg font-semibold text-slate-50">League not found</Text>
            <Text className="text-sm text-slate-400">It may be private or no longer available to your account.</Text>
          </View>
        ) : (
          <>
            <View className="gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">
                {league.type === 'h2h' ? 'Head-to-head league' : 'Classic league'}
              </Text>
              <Text className="text-2xl font-bold text-slate-50">{league.name}</Text>
              {league.description ? <Text className="text-sm leading-5 text-slate-400">{league.description}</Text> : null}
              <Text className="text-sm text-slate-300">
                {league.currentParticipants} of {league.maxParticipants} managers · {league.privacyLevel}
              </Text>
              {league.privacyLevel === 'private' && league.inviteCode ? (
                <View className="mt-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <View>
                      <Text className="text-xs uppercase tracking-wider text-slate-500">Invite code</Text>
                      <Text selectable className="mt-1 font-mono text-lg font-bold text-amber-300">{league.inviteCode}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy invite code"
                      className="min-h-10 justify-center rounded-lg bg-brand-500 px-3"
                      onPress={() => void copyInviteCode()}
                    >
                      <Text className="font-semibold text-on-accent">{copiedInvite ? 'Copied' : 'Copy code'}</Text>
                    </Pressable>
                  </View>
                  {copyError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-red-300">{copyError}</Text> : null}
                </View>
              ) : null}
            </View>

            <View className="gap-3">
              <View className="flex-row items-end justify-between">
                <Text className="text-xl font-bold text-slate-50">Standings</Text>
                <Text className="text-xs text-slate-500">Points · GW points</Text>
              </View>
              {standings.length ? standings.map((standing, index) => {
                const isCurrentUser = standing.userId === session?.user.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${standing.manager} profile`}
                    key={standing.userId}
                    className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                      isCurrentUser ? 'border-brand-500/60 bg-brand-500/10' : 'border-slate-800 bg-slate-900'
                    }`}
                    onPress={() => setSelectedManager(standing)}
                  >
                    <Text className="w-8 text-center text-sm font-bold text-slate-400">{standing.rank ?? index + 1}</Text>
                    <View className="flex-1">
                      <Text className={`font-semibold ${isCurrentUser ? 'text-brand-200' : 'text-slate-50'}`}>
                        {standing.manager}{isCurrentUser ? ' · You' : ''}
                      </Text>
                      {league.type === 'h2h' ? (
                        <Text className="mt-1 text-xs text-slate-500">
                          {standing.wins} wins · {standing.draws} draws · {standing.losses} losses
                        </Text>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-slate-50">{standing.points}</Text>
                      <Text className="text-xs text-slate-500">{standing.gameweekPoints} GW</Text>
                    </View>
                  </Pressable>
                );
              }) : (
                <Text className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                  No standings are available yet.
                </Text>
              )}
            </View>

            {league.type === 'h2h' ? (
              <View className="gap-3">
                <Text className="text-xl font-bold text-slate-50">Fixtures</Text>
                {league.fixtures.length ? league.fixtures.map((fixture) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View gameweek ${fixture.gameweekId} matchup`}
                    key={fixture.id}
                    className="gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4"
                    onPress={() => setSelectedFixture(fixture)}
                  >
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Gameweek {fixture.gameweekId}{fixture.isBye ? ' · Bye' : ''}
                    </Text>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text numberOfLines={1} className="flex-1 font-medium text-slate-50">{fixture.home}</Text>
                      <Text className="font-bold text-cyan-200">{fixture.homePoints} – {fixture.awayPoints}</Text>
                      <Text numberOfLines={1} className="flex-1 text-right font-medium text-slate-50">{fixture.away}</Text>
                    </View>
                  </Pressable>
                )) : (
                  <Text className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                    No head-to-head fixtures are available yet.
                  </Text>
                )}
              </View>
            ) : null}

            <View className="gap-3">
              <View className="flex-row items-end justify-between">
                <Text className="text-xl font-bold text-slate-50">League activity</Text>
                <Text className="text-xs text-slate-500">Recent events</Text>
              </View>
              {activityQuery.isPending ? (
                <View accessibilityLabel="Loading league activity" className="items-center py-6">
                  <ActivityIndicator color="#14b8a6" />
                </View>
              ) : activityQuery.isError ? (
                <View accessibilityRole="alert" className="gap-3 rounded-xl border border-red-900 bg-red-950 p-4">
                  <Text className="text-sm text-red-100">
                    {activityQuery.error instanceof Error ? activityQuery.error.message : 'Unable to load league activity.'}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => void activityQuery.refetch()}>
                    <Text className="font-semibold text-slate-50">Try again</Text>
                  </Pressable>
                </View>
              ) : activityQuery.data?.length ? (
                activityQuery.data.map((activity) => {
                  let description: string;
                  if (activity.type === 'transfer') {
                    const movedIn = activity.playersIn.join(', ');
                    const movedOut = activity.playersOut.join(', ');
                    description = `Transferred ${movedIn || 'players'}${movedOut ? ` in for ${movedOut}` : ''}`;
                  } else if (activity.type === 'captain_pick') {
                    description = `Captain: ${activity.captain ?? 'not set'} · Vice-captain: ${activity.viceCaptain ?? 'not set'}`;
                  } else {
                    description = activity.fromRank === null
                      ? `Joined the rankings at #${activity.toRank ?? '?'}`
                      : `Moved from #${activity.fromRank} to #${activity.toRank ?? '?'}`;
                  }
                  return (
                    <View key={activity.id} className="gap-1 rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <Text className="font-semibold text-slate-50">{activity.manager} · {description}</Text>
                      <Text className="text-xs text-slate-500">
                        {activity.gameweekNumber === null ? 'League update' : `Gameweek ${activity.gameweekNumber}`}
                        {' · '}
                        {new Date(activity.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                  No league activity yet.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setSelectedManager(null);
          setSelectedFixture(null);
        }}
        transparent
        visible={selectedManager !== null || selectedFixture !== null}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.3)' }}
        >
          <View
            className="max-h-[85%] rounded-t-3xl border px-5 pb-8 pt-3"
            style={{
              backgroundColor: modalColors.surface,
              borderColor: modalColors.border,
            }}
          >
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full" style={{ backgroundColor: modalColors.border }} />
            </View>
            <NativeScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-5 pb-2">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text
                      className="text-xs font-bold uppercase tracking-[2px]"
                      style={{ color: modalTextColors.accent }}
                    >
                      {selectedManager ? 'League manager' : 'Head-to-head'}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: modalTextColors.muted }}>
                      {league?.name ?? 'League details'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close details"
                    className="h-10 w-10 items-center justify-center rounded-full border"
                    style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                    onPress={() => {
                      setSelectedManager(null);
                      setSelectedFixture(null);
                    }}
                  >
                    <Text className="text-xl" style={{ color: modalTextColors.secondary }}>×</Text>
                  </Pressable>
                </View>

                {selectedManager ? (
                  <>
                    <View
                      className="flex-row items-center gap-4 rounded-2xl border p-4"
                      style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                    >
                      {selectedManager.avatarUrl ? (
                        <Image
                          accessibilityLabel={`${selectedManager.manager} profile image`}
                          className="h-20 w-20 rounded-full"
                          source={{ uri: selectedManager.avatarUrl }}
                        />
                      ) : (
                        <View
                          className="h-20 w-20 items-center justify-center rounded-full"
                          style={{ backgroundColor: modalColors.accentSurface }}
                        >
                          <Text className="text-3xl font-bold" style={{ color: modalTextColors.accent }}>
                            {selectedManager.manager.trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1 gap-1">
                        <Text className="text-xl font-bold" style={{ color: modalTextColors.primary }}>
                          {selectedManager.manager}
                        </Text>
                        {selectedManager.username ? (
                          <Text className="text-sm" style={{ color: modalTextColors.muted }}>
                            @{selectedManager.username}
                          </Text>
                        ) : null}
                        {selectedManager.rank !== null ? (
                          <View
                            className="mt-2 self-start rounded-full px-3 py-1"
                            style={{ backgroundColor: modalColors.accentSurface }}
                          >
                            <Text className="text-xs font-bold" style={{ color: modalTextColors.accent }}>
                              LEAGUE RANK #{selectedManager.rank}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View className="flex-row gap-3">
                      {[
                        { label: 'SEASON POINTS', value: selectedManager.points },
                        { label: 'GAMEWEEK', value: selectedManager.gameweekPoints },
                      ].map((stat) => (
                        <View
                          className="min-h-24 flex-1 justify-center gap-1 rounded-2xl border px-4 py-3"
                          key={stat.label}
                          style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                        >
                          <Text className="text-[10px] font-bold tracking-wider" style={{ color: modalTextColors.muted }}>
                            {stat.label}
                          </Text>
                          <Text className="text-2xl font-bold" style={{ color: modalTextColors.primary }}>
                            {stat.value.toLocaleString()}
                          </Text>
                          <Text className="text-xs" style={{ color: modalTextColors.muted }}>points</Text>
                        </View>
                      ))}
                    </View>

                    {selectedManager.bio ? (
                      <View
                        className="gap-2 rounded-2xl border p-4"
                        style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                      >
                        <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: modalTextColors.muted }}>
                          About
                        </Text>
                        <Text className="text-sm leading-5" style={{ color: modalTextColors.secondary }}>
                          {selectedManager.bio}
                        </Text>
                      </View>
                    ) : null}

                    {league?.type === 'h2h' ? (
                      <View
                        className="flex-row items-center justify-between rounded-2xl border px-4 py-3"
                        style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                      >
                        {[
                          { label: 'WINS', value: selectedManager.wins, color: modalTextColors.accent },
                          { label: 'DRAWS', value: selectedManager.draws, color: modalTextColors.muted },
                          { label: 'LOSSES', value: selectedManager.losses, color: '#f87171' },
                        ].map((record) => (
                          <View className="items-center gap-1" key={record.label}>
                            <Text className="text-xl font-bold" style={{ color: record.color }}>{record.value}</Text>
                            <Text className="text-[10px] font-bold tracking-wider" style={{ color: modalTextColors.muted }}>
                              {record.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : selectedFixture ? (
                  <>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: modalTextColors.muted }}>
                        GAMEWEEK {selectedFixture.gameweekId}
                      </Text>
                      {selectedFixture.isBye ? (
                        <View className="rounded-full px-3 py-1" style={{ backgroundColor: modalColors.accentSurface }}>
                          <Text className="text-xs font-bold" style={{ color: modalTextColors.accent }}>BYE</Text>
                        </View>
                      ) : null}
                    </View>
                    <View
                      className="flex-row items-center gap-3 rounded-2xl border p-4"
                      style={{ backgroundColor: modalColors.card, borderColor: modalColors.border }}
                    >
                      <View className="flex-1 items-center gap-2">
                        <Text className="text-center text-sm font-semibold" style={{ color: modalTextColors.secondary }}>
                          {selectedFixture.home}
                        </Text>
                        <Text className="text-3xl font-black" style={{ color: modalTextColors.primary }}>
                          {selectedFixture.homePoints}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold tracking-widest" style={{ color: modalTextColors.muted }}>VS</Text>
                      <View className="flex-1 items-center gap-2">
                        <Text className="text-center text-sm font-semibold" style={{ color: modalTextColors.secondary }}>
                          {selectedFixture.away}
                        </Text>
                        <Text className="text-3xl font-black" style={{ color: modalTextColors.primary }}>
                          {selectedFixture.awayPoints}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-center text-sm" style={{ color: modalTextColors.muted }}>
                      {selectedFixture.isBye
                        ? 'This manager has a bye this gameweek.'
                        : selectedFixture.homePoints === selectedFixture.awayPoints
                          ? 'The matchup is tied.'
                          : `${selectedFixture.homePoints > selectedFixture.awayPoints ? selectedFixture.home : selectedFixture.away} leads this matchup.`}
                    </Text>
                  </>
                ) : null}
              </View>
            </NativeScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
