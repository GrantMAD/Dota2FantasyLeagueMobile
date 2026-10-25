import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ScreenScrollView } from '@/src/components/ScreenScrollView';
import { SymbolView } from 'expo-symbols';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { MetricCard } from '@/src/components/MetricCard';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { Screen } from '@/src/components/Screen';
import { getManagerProfile } from '@/src/features/account/api';
import { getDashboardWhatsNew, getTransferRush } from '@/src/features/dashboard/api';
import { DashboardLiveMatches } from '@/src/features/dashboard/DashboardLiveMatches';
import { GettingStartedChecklist } from '@/src/features/dashboard/GettingStartedChecklist';
import { TransferDeadlineRush } from '@/src/features/dashboard/TransferDeadlineRush';
import { PersonalGoalsProgress } from '@/src/features/fantasy/PersonalGoalsProgress';
import { getMatches } from '@/src/features/competition/api';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { getLeagues } from '@/src/features/leagues/api';
import { useAuth } from '@/src/lib/auth';

function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

const STARTER_SLOT_ORDER = ['carry', 'mid', 'offlane', 'support', 'hard_support'];

export default function HomeScreen() {
  const query = useFantasyContext();
  const { session } = useAuth();
  const profileQuery = useQuery({
    queryKey: ['manager-profile'],
    queryFn: getManagerProfile,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const leaguesQuery = useQuery({
    queryKey: ['leagues'],
    queryFn: getLeagues,
    staleTime: 60_000,
  });
  const whatsNewQuery = useQuery({
    queryKey: ['dashboard-whats-new'],
    queryFn: getDashboardWhatsNew,
    enabled: Boolean(session),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const liveMatchesQuery = useQuery({
    queryKey: ['dashboard-live-matches'],
    queryFn: () => getMatches('live'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const transferRushQuery = useQuery({
    queryKey: ['transfer-rush'],
    queryFn: () => getTransferRush(60),
    enabled: Boolean(session),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
  const myLeagues = (leaguesQuery.data ?? [])
    .filter((league) => league.standings.some((standing) => standing.userId === session?.user.id))
    .slice(0, 3);
  const starters = (query.data?.lineup ?? [])
    .filter((entry) => entry.is_starter)
    .sort((a, b) => STARTER_SLOT_ORDER.indexOf(a.slot) - STARTER_SLOT_ORDER.indexOf(b.slot));
  const squadSize = query.data?.ownedPlayers.length ?? 0;
  const hasSquad = squadSize > 0;
  const hasCompleteLineup = starters.length === 5 && starters.some((entry) => entry.is_captain);
  const displayName = profileQuery.data?.displayName?.trim() || profileQuery.data?.username;
  const quickActions = !query.data
    ? []
    : !hasSquad
      ? [{
          title: 'Build your squad',
          description: `Choose players with your ${query.data.budget.toFixed(1)}M budget.`,
          href: '/team' as const,
        }]
      : [
          {
            title: starters.length < 5 ? 'Complete your starting lineup' : 'Review your lineup',
            description: starters.length < 5
              ? `Choose all five starters${query.data.gameweek?.deadline ? ` before ${new Date(query.data.gameweek.deadline).toLocaleString()}` : ''}.`
              : query.data.gameweek?.isLocked
                ? 'The deadline has passed. Review your saved lineup.'
                : 'Check your starters and captain before the deadline.',
            href: '/team' as const,
          },
          ...(query.data.freeTransfers > 0
            ? [{
                title: `Use ${query.data.freeTransfers} free transfer${query.data.freeTransfers === 1 ? '' : 's'}`,
                description: 'Improve your squad without a transfer penalty.',
                href: '/team' as const,
              }]
            : []),
          {
            title: myLeagues.length ? 'Check your league standings' : 'Join a league',
            description: myLeagues.length
              ? 'See how you compare with your rivals.'
              : 'Compete with friends or join a public league.',
            href: '/leagues' as const,
          },
          ...(query.data.gameweek
            ? [{
                title: 'View gameweek schedule',
                description: query.data.gameweek.deadline
                  ? `Deadline: ${new Date(query.data.gameweek.deadline).toLocaleString()}.`
                  : `Review Gameweek ${query.data.gameweek.gameweekNumber} fixtures.`,
                href: '/gameweeks' as const,
              }]
            : []),
        ];

  return (
    <Screen>
      <ScreenScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            accessibilityLabel="Refresh fantasy dashboard"
            onRefresh={() => {
              void Promise.all([
                query.refetch(),
                leaguesQuery.refetch(),
                whatsNewQuery.refetch(),
                liveMatchesQuery.refetch(),
                transferRushQuery.refetch(),
              ]);
            }}
            refreshing={query.isRefetching || liveMatchesQuery.isRefetching || transferRushQuery.isRefetching}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy Dota 2</Text>
          <Text className="mt-2 text-3xl font-bold text-white">
            {displayName ? `Welcome back, ${displayName}` : 'Your dashboard'}
          </Text>
          <Text className="mt-1 text-sm text-slate-400">Your fantasy team, at a glance.</Text>
          <View className="mt-3">
            <DataFreshnessBadge page="dashboard" />
          </View>
        </View>

        {query.data?.fantasySeasonId !== null &&
        query.data?.fantasySeasonId !== undefined &&
        leaguesQuery.isSuccess ? (
          <GettingStartedChecklist
            hasSquad={hasSquad}
            ownedPlayerCount={squadSize}
            hasCompleteLineup={hasCompleteLineup}
            hasLeague={myLeagues.length > 0}
          />
        ) : null}

        {/* Transfer Deadline Rush Widget */}
        {transferRushQuery.isPending ? (
          <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 rounded-xl bg-slate-800" />
              <View className="gap-1.5">
                <View className="h-4 w-40 rounded bg-slate-800" />
                <View className="h-3 w-28 rounded bg-slate-800" />
              </View>
            </View>
            <View className="h-10 rounded-xl bg-slate-800" />
          </View>
        ) : transferRushQuery.isError ? (
          <View accessibilityRole="alert" className="gap-2 rounded-2xl border border-red-900/70 bg-red-950/50 p-4">
            <Text className="text-sm font-semibold text-red-200">Transfer Deadline Rush unavailable</Text>
            <Text className="text-xs leading-5 text-red-300">
              {transferRushQuery.error instanceof Error
                ? transferRushQuery.error.message
                : 'Could not load transfer activity.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="min-h-9 justify-center self-start"
              onPress={() => void transferRushQuery.refetch()}
            >
              <Text className="text-xs font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : transferRushQuery.data ? (
          <TransferDeadlineRush data={transferRushQuery.data} />
        ) : null}

        <View className="gap-4 overflow-hidden rounded-2xl border border-cyan-500/50 bg-cyan-950/30 p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/15">
              <SymbolView
                name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }}
                size={21}
                tintColor="#67e8f9"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">What’s New</Text>
              <Text className="mt-0.5 text-xs text-slate-300">Live updates across Fantasy Dota 2</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Live</Text>
            </View>
          </View>

          {whatsNewQuery.isPending ? (
            <View accessibilityLabel="Loading dashboard updates" className="min-h-16 items-center justify-center rounded-xl border border-cyan-900/60 bg-slate-950/40">
              <ActivityIndicator color="#14b8a6" />
            </View>
          ) : whatsNewQuery.isError ? (
            <View accessibilityRole="alert" className="gap-2 rounded-xl border border-red-900/70 bg-red-950/50 p-3">
              <Text className="text-sm leading-5 text-red-200">
                What’s New could not be loaded: {whatsNewQuery.error instanceof Error
                  ? whatsNewQuery.error.message
                  : 'Please try again.'}
              </Text>
              <Pressable accessibilityRole="button" className="min-h-9 justify-center self-start" onPress={() => void whatsNewQuery.refetch()}>
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : whatsNewQuery.data ? (
            <View className="gap-3">
              {whatsNewQuery.data.gameweek ? (
                <Link href={`/gameweek/${whatsNewQuery.data.gameweek.id}`} asChild>
                  <Pressable className="gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3.5">
                    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                        {whatsNewQuery.data.gameweek.isCurrent ? 'Current' : 'Next'}
                      </Text>
                      <Text className="font-bold text-cyan-100">GW {whatsNewQuery.data.gameweek.number}</Text>
                      <Text className="text-xs text-slate-300">{whatsNewQuery.data.gameweek.matchCount} matches</Text>
                    </View>
                    <Text className="text-xs leading-5 text-slate-300">
                      Deadline: {new Date(whatsNewQuery.data.gameweek.deadline).toLocaleString('en', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'UTC',
                      })} UTC
                      {whatsNewQuery.data.gameweek.endsSoon ? ' · Gameweek ends within 24 hours — make your final moves now.' : ''}
                    </Text>
                    <Text className="text-xs font-semibold text-cyan-200">View gameweek ›</Text>
                  </Pressable>
                </Link>
              ) : null}

              {whatsNewQuery.data.events.length || whatsNewQuery.data.updates.length ? (
                <View className="gap-2">
                  <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-cyan-100/80">Recent updates</Text>
                  {whatsNewQuery.data.events.slice(0, 3).map((event) => (
                    <Link key={event.id} href={`/tournament/${event.id}`} asChild>
                      <Pressable className="flex-row items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                        <SymbolView name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }} size={17} tintColor="#67e8f9" />
                        <View className="flex-1 gap-1">
                          <Text className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">Tournament active</Text>
                          <Text className="font-semibold text-white">{event.title}</Text>
                          <Text className="text-xs leading-5 text-slate-400">
                            {[event.tier, `${event.seriesCount} series`, `${event.matchCount} matches`,
                              ...(event.bestOfFormats.length ? [`Bo${event.bestOfFormats.join(' / Bo')}`] : [])]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </View>
                        <Text className="pt-1 font-bold text-cyan-200">›</Text>
                      </Pressable>
                    </Link>
                  ))}
                  {whatsNewQuery.data.updates.map((update) => (
                    <Link key={`${update.kind}-${update.id}`} href={`/player/${update.playerId}`} asChild>
                      <Pressable className="flex-row items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                        <SymbolView
                          name={update.kind === 'availability'
                            ? { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }
                            : { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
                          size={17}
                          tintColor={update.kind === 'availability' ? '#fbbf24' : '#34d399'}
                        />
                        <View className="flex-1 gap-1">
                          <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                            update.kind === 'availability' ? 'text-amber-200' : 'text-emerald-200'
                          }`}>
                            {update.kind === 'availability' ? 'Squad availability' : 'Player price'}
                          </Text>
                          <Text className="font-semibold text-white">{update.title}</Text>
                          <Text className="text-xs leading-5 text-slate-400">{update.message}</Text>
                        </View>
                        <Text className="pt-1 font-bold text-cyan-200">›</Text>
                      </Pressable>
                    </Link>
                  ))}
                </View>
              ) : null}

              {!whatsNewQuery.data.gameweek &&
              whatsNewQuery.data.events.length === 0 &&
              whatsNewQuery.data.updates.length === 0 ? (
                <Text className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 text-sm leading-5 text-slate-300">
                  No new events or squad updates right now.
                </Text>
              ) : null}

              <Link href="/notifications" asChild>
                <Pressable accessibilityRole="button" className="min-h-10 flex-row items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                  <Text className="text-sm font-semibold text-cyan-200">View all notifications</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading fantasy dashboard" className="gap-3">
            <View className="h-28 rounded-2xl bg-slate-800" />
            <View className="flex-row gap-3">
              <View className="h-28 flex-1 rounded-2xl bg-slate-800" />
              <View className="h-28 flex-1 rounded-2xl bg-slate-800" />
            </View>
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Dashboard unavailable</Text>
            <Text className="mt-2 text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Please try again.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              className="mt-4 min-h-11 justify-center"
              onPress={() => void query.refetch()}
            >
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data ? (
          <>
            <PersonalGoalsProgress
              totalPoints={query.data.totalPoints}
              globalRank={query.data.globalRank}
              targetPoints={query.data.targetPoints}
              targetRank={query.data.targetRank}
            />

            <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-sm font-medium text-slate-400">Season points</Text>
              <Text className="mt-2 text-4xl font-bold text-white">{formatMetric(query.data.totalPoints)}</Text>
              <Text className="mt-2 text-sm text-slate-400">
                {query.data.gameweek ? `Gameweek ${query.data.gameweek.gameweekNumber}` : 'Fantasy season'}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <MetricCard
                label="Budget"
                value={typeof query.data.budget === 'number' && Number.isFinite(query.data.budget) ? `${query.data.budget.toFixed(1)}M` : '—'}
                detail="Available funds"
              />
              <MetricCard label="Free transfers" value={formatMetric(query.data.freeTransfers)} />
            </View>
            <View className="flex-row gap-3">
              <MetricCard label="Global rank" value={formatMetric(query.data.globalRank)} />
              <MetricCard label="Squad" value={formatMetric(query.data.ownedPlayers.length)} detail="Players owned" />
            </View>
            <MetricCard
              label="Squad value"
              value={`${query.data.ownedPlayers.reduce((total, player) => total + player.current_price, 0).toFixed(1)}M`}
              detail="Current player prices"
            />
            {query.data.gameweek?.deadline ? (
              <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">Gameweek deadline</Text>
                <Text className="mt-2 text-base font-semibold text-white">
                  {new Date(query.data.gameweek.deadline).toLocaleString()}
                </Text>
              </View>
            ) : null}
            {/* Live Matches In Progress */}
            {liveMatchesQuery.data && liveMatchesQuery.data.length > 0 ? (
              <DashboardLiveMatches
                matches={liveMatchesQuery.data}
                userStarterTeamIds={
                  starters
                    .map((s) => s.professional_players?.professional_teams?.id)
                    .filter((id): id is number => typeof id === 'number')
                }
              />
            ) : null}

            {hasSquad ? (
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-lg font-bold text-white">Starting Five</Text>
                    <Text className="mt-1 text-xs text-slate-400">
                      {starters.length} of 5 starters · Tap a player for score details
                    </Text>
                  </View>
                  <Link href="/team" asChild>
                    <Pressable accessibilityRole="button" className="min-h-10 justify-center px-2">
                      <Text className="text-sm font-semibold text-brand-300">My Team ›</Text>
                    </Pressable>
                  </Link>
                </View>
                {starters.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-1">
                    {starters.map((entry) => {
                      const player = entry.professional_players;
                      if (!player) return null;
                      const playerName = player.in_game_name || player.name;
                      return (
                        <Link key={`${entry.slot}-${entry.player_id}`} href={`/player/${entry.player_id}`} asChild>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View ${playerName}${entry.is_captain ? ', captain' : entry.is_vice_captain ? ', vice-captain' : ''} details and score breakdown`}
                            className="w-40 gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3"
                          >
                            <View className="flex-row items-center gap-2">
                              <PlayerAvatar uri={player.profile_image_url} label={playerName} size={38} />
                              <View className="flex-1">
                                <Text numberOfLines={1} className="text-sm font-bold text-white">{playerName}</Text>
                                <Text numberOfLines={1} className="text-[10px] text-slate-400">
                                  {player.professional_teams?.name ?? 'Free agent'}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center justify-between">
                              <Text className="text-[10px] font-semibold uppercase text-brand-300">{entry.slot.replace('_', ' ')}</Text>
                              <Text className="text-[10px] font-bold text-amber-300">
                                {entry.is_captain ? 'Captain' : entry.is_vice_captain ? 'Vice' : ''}
                              </Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                              <Text className="text-xs font-semibold text-emerald-300">
                                GW Pts · {((player.current_gw_points ?? 0) * (entry.is_captain ? 2 : 1)).toFixed(1)} pts
                              </Text>
                              {entry.is_captain && (player.current_gw_points ?? 0) > 0 ? (
                                <Text className="text-[10px] font-bold text-amber-300 opacity-80">&times;2</Text>
                              ) : null}
                            </View>
                          </Pressable>
                        </Link>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text className="rounded-xl border border-dashed border-slate-700 p-4 text-sm leading-5 text-slate-400">
                    Your starting lineup is not set yet. Complete it on My Team.
                  </Text>
                )}
              </View>
            ) : (
              <View className="gap-3 rounded-2xl border border-dashed border-brand-500/50 bg-brand-950/30 p-5">
                <Text className="text-lg font-bold text-white">Build your first fantasy squad</Text>
                <Text className="text-sm leading-5 text-slate-300">
                  Draft your players, set a captain, and start competing for gameweek points.
                </Text>
                <Link href="/team" asChild>
                  <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center rounded-xl bg-brand-500 px-4">
                    <Text className="font-bold text-white">Build your squad</Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </>
        ) : (
          <View className="gap-3 rounded-2xl border border-dashed border-brand-500/50 bg-brand-950/30 p-5">
            <Text className="font-semibold text-white">Start your fantasy season</Text>
            <Text className="text-sm leading-5 text-slate-300">
              Create your squad to get started. Your season details will appear here once available.
            </Text>
            <Link href="/team" asChild>
              <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center rounded-xl bg-brand-500 px-4">
                <Text className="font-bold text-white">Build your squad</Text>
              </Pressable>
            </Link>
          </View>
        )}

        <View className="gap-3">
          <Text className="text-xl font-bold text-white">Your Next Moves</Text>
          <View className="gap-2">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href} asChild>
                <Pressable accessibilityRole="button" className="min-h-16 flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-white">{action.title}</Text>
                    <Text className="mt-1 text-xs leading-4 text-slate-400">{action.description}</Text>
                  </View>
                  <Text className="font-bold text-brand-300">›</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <View className="flex-row items-center justify-between gap-3">
            <View>
              <Text className="text-lg font-bold text-white">Leagues Overview</Text>
              <Text className="mt-1 text-sm text-slate-400">Your active competition standings.</Text>
            </View>
            <Link href="/leagues" asChild>
              <Pressable accessibilityRole="button" className="min-h-10 justify-center">
                <Text className="text-sm font-semibold text-brand-300">View all</Text>
              </Pressable>
            </Link>
          </View>
          {leaguesQuery.isPending ? (
            <ActivityIndicator accessibilityLabel="Loading league overview" color="#14b8a6" />
          ) : leaguesQuery.isError ? (
            <View accessibilityRole="alert" className="gap-2">
              <Text className="text-sm text-red-300">
                {leaguesQuery.error instanceof Error ? leaguesQuery.error.message : 'Unable to load your leagues.'}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void leaguesQuery.refetch()}>
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : myLeagues.length ? (
            myLeagues.map((league) => {
              const standing = league.standings.find((item) => item.userId === session?.user.id);
              return (
                <Link key={league.id} href={`/league/${league.id}`} asChild>
                  <Pressable className="flex-row items-center justify-between gap-3 border-t border-slate-800 pt-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-white">{league.name}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{league.type === 'h2h' ? 'Head to head' : 'Classic'} · {league.currentParticipants} managers</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-brand-300">#{standing?.rank ?? '—'}</Text>
                      <Text className="text-xs text-slate-400">{standing?.points ?? 0} pts</Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })
          ) : (
            <View className="gap-2">
              <Text className="text-sm text-slate-300">You have not joined a league yet.</Text>
              <Link href="/leagues" asChild>
                <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start">
                  <Text className="font-semibold text-brand-300">Find or create a league</Text>
                </Pressable>
              </Link>
            </View>
          )}
        </View>

        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Updating dashboard" color="#14b8a6" /> : null}
      </ScreenScrollView>
    </Screen>
  );
}
