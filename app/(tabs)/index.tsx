import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ScreenScrollView } from '@/src/components/ScreenScrollView';
import { SymbolView } from 'expo-symbols';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { Screen } from '@/src/components/Screen';
import { getManagerProfile } from '@/src/features/account/api';
import { getDashboardWhatsNew, getTransferRush, type DashboardUpdate } from '@/src/features/dashboard/api';
import { DashboardPointsModal } from '@/src/features/dashboard/DashboardPointsModal';
import {
  getFriendActivity,
  keepLatestGameweekScoreActivities,
} from '@/src/features/friends/api';
import { DashboardLiveMatches } from '@/src/features/dashboard/DashboardLiveMatches';
import { GettingStartedChecklist } from '@/src/features/dashboard/GettingStartedChecklist';
import { TransferDeadlineRush } from '@/src/features/dashboard/TransferDeadlineRush';
import { PersonalGoalsProgress } from '@/src/features/fantasy/PersonalGoalsProgress';
import { getMatches } from '@/src/features/competition/api';
import { getDashboardSquadSummary, type FantasyLineupEntry } from '@/src/features/fantasy/api';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { getAnalytics } from '@/src/features/analytics/api';
import { getLeagues, getLeagueActivity, getLatestRankChangeForUser } from '@/src/features/leagues/api';
import { markNotificationRead } from '@/src/features/notifications/api';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';
import {
  groupMobileWhatsNewItems,
  getMobileCategoryTheme,
  type MobileFeedGroupItem,
  type MobileFeedItemChild,
} from '@/src/features/dashboard/whats-new-grouping';
import {
  CaptainScoringGuide,
  DashboardRetryAlert,
  DashboardGreeting,
  getDashboardDetailColor,
  getPointTrend,
  getRankTrend,
  LineupProgress,
} from '@/src/features/dashboard/DashboardPresentation';

function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

const STARTER_SLOT_ORDER = ['carry', 'mid', 'offlane', 'support', 'hard_support'];

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const query = useFantasyContext();
  const { session } = useAuth();
  const [pointsBreakdownOpen, setPointsBreakdownOpen] = useState(false);
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
  const squadSummaryQuery = useQuery({
    queryKey: ['dashboard-squad-summary', session?.user.id],
    queryFn: getDashboardSquadSummary,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const analyticsQuery = useQuery({
    queryKey: ['dashboard-analytics-trends'],
    queryFn: getAnalytics,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const whatsNewQuery = useQuery({
    queryKey: ['dashboard-whats-new'],
    queryFn: getDashboardWhatsNew,
    enabled: Boolean(session),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const dashboardUpdates = whatsNewQuery.data?.updates ?? [];
  const liveMatchesQuery = useQuery({
    queryKey: ['dashboard-live-matches'],
    queryFn: () => getMatches('live'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const [whatsNewTab, setWhatsNewTab] = useState<'all' | 'friends' | 'squad' | 'tournaments'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const friendActivityQuery = useQuery({
    queryKey: ['friend-activity-feed', 'dashboard'],
    queryFn: () => getFriendActivity(null),
    enabled: Boolean(session),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const friendActivities = keepLatestGameweekScoreActivities(
    friendActivityQuery.data?.activities ?? [],
  );
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
  const leagueActivityQueries = useQueries({
    queries: myLeagues.map((league) => ({
      queryKey: ['league', 'activity', league.id],
      queryFn: () => getLeagueActivity(league.id),
      staleTime: 60_000,
    })),
  });
  const starters = (query.data?.lineup ?? [])
    .filter((entry) => entry.is_starter)
    .sort((a, b) => STARTER_SLOT_ORDER.indexOf(a.slot) - STARTER_SLOT_ORDER.indexOf(b.slot));
  const captain = query.data?.lineup.find((entry) => entry.is_captain) ?? null;
  const viceCaptain = query.data?.lineup.find((entry) => entry.is_vice_captain) ?? null;
  const squadSize = query.data?.ownedPlayers.length ?? 0;
  const activeSquadCount = squadSummaryQuery.data?.activeSquadCount ?? 0;
  const hasActiveSquad = !squadSummaryQuery.isPending && !squadSummaryQuery.isError && activeSquadCount > 0;
  const hasSquad = squadSize > 0;
  const hasCompleteLineup = starters.length === 5 && starters.some((entry) => entry.is_captain);
  const displayName = profileQuery.data?.displayName?.trim() || profileQuery.data?.username;
  const pointTrend = analyticsQuery.isError
    ? { text: 'Trend unavailable' }
    : analyticsQuery.isPending
      ? { text: 'Trend loading' }
      : getPointTrend(analyticsQuery.data?.trend ?? []);
  const rankTrend = query.data?.globalRank == null
    ? { text: 'Unranked' }
    : analyticsQuery.isError
      ? { text: 'Trend unavailable' }
      : analyticsQuery.isPending
        ? { text: 'Trend loading' }
        : getRankTrend(analyticsQuery.data?.trend ?? []);
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
          query.data.freeTransfers > 0
            ? {
                title: `Use ${query.data.freeTransfers} free transfer${query.data.freeTransfers === 1 ? '' : 's'}`,
                description: 'Improve your squad without a transfer penalty.',
                href: '/team' as const,
              }
            : {
                title: 'Scout the transfer market',
                description: 'Find players who can strengthen your squad.',
                href: '/team' as const,
              },
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
                squadSummaryQuery.refetch(),
                whatsNewQuery.refetch(),
                friendActivityQuery.refetch(),
                liveMatchesQuery.refetch(),
                transferRushQuery.refetch(),
              ]);
            }}
            refreshing={query.isRefetching || liveMatchesQuery.isRefetching || transferRushQuery.isRefetching || friendActivityQuery.isRefetching}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy Dota 2</Text>
          <DashboardGreeting
            loading={profileQuery.isPending}
            displayName={displayName}
          />
          <Text className="mt-1 text-sm text-slate-400">
            Manage your fantasy squads and compete with players worldwide.
          </Text>
          <View className="mt-3">
            <DataFreshnessBadge page="dashboard" />
          </View>
        </View>

        {query.isError ? (
          <DashboardRetryAlert
            title={query.data ? 'Dashboard refresh failed' : 'Dashboard unavailable'}
            message={[
              query.data ? 'Previously loaded data may be out of date.' : null,
              query.error instanceof Error ? query.error.message : 'Please try again.',
            ].filter(Boolean).join(' ')}
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {query.data ? (
          <View className="gap-3">
            <View className="flex-row gap-3">
              <HomeStatCard
                label="Active Squads"
                value={squadSummaryQuery.isPending ? '…' : formatMetric(squadSummaryQuery.data?.activeSquadCount)}
                detail={
                  squadSummaryQuery.isPending
                    ? 'Squad details loading'
                    : squadSummaryQuery.isError
                      ? 'Squad details unavailable'
                      : `${squadSummaryQuery.data?.activeSquadCount ?? 0} active ${(squadSummaryQuery.data?.activeSquadCount ?? 0) === 1 ? 'squad' : 'squads'}`
                }
                icon={{ ios: 'shield.fill', android: 'shield', web: 'shield' }}
                tint="#22d3ee"
                detailIcon={hasActiveSquad
                  ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                  : undefined}
                detailAccent={hasActiveSquad ? (isDark ? '#22d3ee' : '#0e7490') : undefined}
                onPress={() => router.push('/team')}
              />
              <HomeStatCard
                label="Squad Value"
                value={`${query.data.ownedPlayers.reduce((total, player) => total + player.current_price, 0).toFixed(1)}M`}
                detail={squadSize > 0 ? `${squadSize} ${squadSize === 1 ? 'player' : 'players'}` : 'No players yet'}
                icon={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
                tint="#34d399"
                detailIcon={{ ios: 'person.fill', android: 'person', web: 'person' }}
                detailAccent={squadSize > 0 ? (isDark ? '#34d399' : '#047857') : undefined}
                onPress={() => router.push('/team')}
              />
            </View>
            <View className="flex-row gap-3">
              <HomeStatCard
                label="Bank Balance"
                value={typeof query.data.budget === 'number' && Number.isFinite(query.data.budget) ? `${query.data.budget.toFixed(1)}M` : '—'}
                detail="Available for transfers"
                icon={{ ios: 'dollarsign.circle.fill', android: 'paid', web: 'paid' }}
                tint="#fbbf24"
                detailIcon={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
                detailAccent={isDark ? '#fbbf24' : '#92400e'}
                onPress={() => router.push('/team')}
              />
              <HomeStatCard
                label="Total Points"
                value={formatMetric(query.data.totalPoints)}
                detail={pointTrend.text}
                trendDirection={pointTrend.direction}
                icon={{ ios: 'star.fill', android: 'star', web: 'star' }}
                tint="#f59e0b"
                onPress={() => setPointsBreakdownOpen(true)}
              />
            </View>
            <View className="flex-row gap-3">
              <HomeStatCard
                label="Global Rank"
                value={formatMetric(query.data.globalRank)}
                detail={rankTrend.text}
                trendDirection={rankTrend.direction}
                icon={{ ios: 'globe', android: 'public', web: 'public' }}
                tint="#2dd4bf"
                onPress={() => router.push('/leaderboard')}
              />
              <HomeStatCard
                label="Free Transfers"
                value={formatMetric(query.data.freeTransfers)}
                detail={query.data.freeTransfers > 0 ? 'Available this gameweek' : 'No transfers remaining'}
                icon={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
                tint="#fb923c"
                detailIcon={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
                detailAccent={query.data.freeTransfers > 0 ? (isDark ? '#fb923c' : '#c2410c') : undefined}
                onPress={() => router.push('/team')}
              />
            </View>
            {squadSummaryQuery.isError ? (
              <View accessibilityRole="alert" className="flex-row items-center justify-between gap-3 rounded-xl border border-red-900/70 bg-red-950/40 px-3 py-2">
                <Text className="flex-1 text-xs text-red-200">
                  {squadSummaryQuery.error instanceof Error
                    ? squadSummaryQuery.error.message
                    : 'Squad summary unavailable.'}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => void squadSummaryQuery.refetch()}>
                  <Text className="font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : query.isPending ? (
          <View accessibilityLabel="Loading dashboard statistics" className="gap-3">
            {[0, 1, 2].map((row) => (
              <View key={row} className="flex-row gap-3">
                {[0, 1].map((card) => (
                  <View key={card} className="h-32 flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <View className="mb-3 h-9 w-9 rounded-xl bg-slate-800" />
                    <View className="h-3 w-24 rounded bg-slate-800" />
                    <View className="mt-2 h-6 w-16 rounded bg-slate-800" />
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {analyticsQuery.isError ? (
          <DashboardRetryAlert
            title="Dashboard trends unavailable"
            message={analyticsQuery.error instanceof Error
              ? analyticsQuery.error.message
              : 'Points and rank trends could not be loaded.'}
            onRetry={() => void analyticsQuery.refetch()}
          />
        ) : null}

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

        <View className="gap-4 px-1 py-2">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/15">
              <SymbolView
                name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }}
                size={21}
                tintColor="#67e8f9"
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>What’s New</Text>
              <Text className="mt-0.5 text-xs" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>Live updates across Fantasy Dota 2</Text>
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

              {/* Filter Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="flex-row items-center gap-2 py-1"
              >
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: whatsNewTab === 'all' }}
                  onPress={() => setWhatsNewTab('all')}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                    whatsNewTab === 'all' ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${whatsNewTab === 'all' ? 'text-slate-950 font-bold' : 'text-slate-300'}`}>
                    All
                  </Text>
                  <View className={`rounded-full px-1.5 py-0.2 ${whatsNewTab === 'all' ? 'bg-slate-950/20' : 'bg-slate-700'}`}>
                    <Text className={`text-[10px] font-bold ${whatsNewTab === 'all' ? 'text-slate-950' : 'text-slate-300'}`}>
                      {friendActivities.length +
                        dashboardUpdates.length +
                        whatsNewQuery.data.events.length}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: whatsNewTab === 'friends' }}
                  onPress={() => setWhatsNewTab('friends')}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                    whatsNewTab === 'friends' ? 'bg-teal-500' : 'bg-slate-800'
                  }`}
                >
                  <SymbolView name={{ ios: 'person.2.fill', android: 'group', web: 'group' }} size={13} tintColor={whatsNewTab === 'friends' ? '#022c22' : '#2dd4bf'} />
                  <Text className={`text-xs font-semibold ${whatsNewTab === 'friends' ? 'text-slate-950 font-bold' : 'text-slate-300'}`}>
                    Friends
                  </Text>
                  <View className={`rounded-full px-1.5 py-0.2 ${whatsNewTab === 'friends' ? 'bg-slate-950/20' : 'bg-slate-700'}`}>
                    <Text className={`text-[10px] font-bold ${whatsNewTab === 'friends' ? 'text-slate-950' : 'text-slate-300'}`}>
                      {friendActivities.length}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: whatsNewTab === 'squad' }}
                  onPress={() => setWhatsNewTab('squad')}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                    whatsNewTab === 'squad' ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <SymbolView name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }} size={13} tintColor={whatsNewTab === 'squad' ? '#022c22' : '#34d399'} />
                  <Text className={`text-xs font-semibold ${whatsNewTab === 'squad' ? 'text-slate-950 font-bold' : 'text-slate-300'}`}>
                    Squad Alerts
                  </Text>
                  <View className={`rounded-full px-1.5 py-0.2 ${whatsNewTab === 'squad' ? 'bg-slate-950/20' : 'bg-slate-700'}`}>
                    <Text className={`text-[10px] font-bold ${whatsNewTab === 'squad' ? 'text-slate-950' : 'text-slate-300'}`}>
                      {dashboardUpdates.length}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: whatsNewTab === 'tournaments' }}
                  onPress={() => setWhatsNewTab('tournaments')}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
                    whatsNewTab === 'tournaments' ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <SymbolView name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }} size={13} tintColor={whatsNewTab === 'tournaments' ? '#451a03' : '#f59e0b'} />
                  <Text className={`text-xs font-semibold ${whatsNewTab === 'tournaments' ? 'text-slate-950 font-bold' : 'text-slate-300'}`}>
                    Tournaments
                  </Text>
                  <View className={`rounded-full px-1.5 py-0.2 ${whatsNewTab === 'tournaments' ? 'bg-slate-950/20' : 'bg-slate-700'}`}>
                    <Text className={`text-[10px] font-bold ${whatsNewTab === 'tournaments' ? 'text-slate-950' : 'text-slate-300'}`}>
                      {whatsNewQuery.data.events.length}
                    </Text>
                  </View>
                </Pressable>
              </ScrollView>

              {/* Feed items */}
              <View className="gap-2">
                {(() => {
                  const feedItems = groupMobileWhatsNewItems(
                    friendActivities,
                    dashboardUpdates,
                    whatsNewQuery.data.events ?? [],
                    whatsNewTab,
                  );

                  const groupedCategoryKeys = feedItems
                    .filter((item): item is MobileFeedGroupItem => item.type === 'group')
                    .map((g) => g.category);
                  const hasGroups = groupedCategoryKeys.length > 0;
                  const areAllExpanded =
                    hasGroups && groupedCategoryKeys.every((k) => Boolean(expandedCategories[k]));

                  const toggleAllExpanded = () => {
                    if (areAllExpanded) {
                      setExpandedCategories({});
                    } else {
                      const next: Record<string, boolean> = {};
                      for (const k of groupedCategoryKeys) {
                        next[k] = true;
                      }
                      setExpandedCategories(next);
                    }
                  };

                  const toggleCategory = (key: string) => {
                    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
                  };

                  const renderFeedChild = (child: MobileFeedItemChild, isNested = false) => {
                    if (child.type === 'friend') {
                      const activity = child.data;
                      return (
                        <Link key={`f-${activity.activity_id}`} href="/friends" asChild>
                          <Pressable
                            className={`flex-row items-start gap-3 rounded-xl ${isNested ? 'p-2.5' : 'p-3'}`}
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: '#14b8a6',
                              backgroundColor: isDark ? 'rgba(20, 184, 166, 0.08)' : 'rgba(13, 148, 136, 0.07)',
                            }}
                          >
                            <SymbolView
                              name={
                                activity.activity_type === 'transfer'
                                  ? { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }
                                  : activity.activity_type === 'chip'
                                    ? { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }
                                    : activity.activity_type === 'lineup'
                                      ? { ios: 'list.clipboard.fill', android: 'assignment', web: 'assignment' }
                                      : { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }
                              }
                              size={17}
                              tintColor="#2dd4bf"
                            />
                            <View className="flex-1 gap-1">
                              <View className="flex-row items-center gap-1.5">
                                <Text className="text-[10px] font-bold uppercase tracking-wider text-teal-300">Friend Move</Text>
                                <Text className="text-xs text-slate-500">·</Text>
                                <Text className="text-xs font-bold text-slate-200">
                                  {activity.display_name?.trim() || activity.username}
                                </Text>
                              </View>
                              <Text className="font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {activity.title}
                              </Text>
                              {activity.activity_type === 'transfer' &&
                              (activity.players_in?.length || activity.players_out?.length) ? (
                                <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                                  {activity.players_in?.map((p) => (
                                    <Text
                                      key={`in-${p}`}
                                      className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300"
                                    >
                                      +{p}
                                    </Text>
                                  ))}
                                  {activity.players_out?.map((p) => (
                                    <Text
                                      key={`out-${p}`}
                                      className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300"
                                    >
                                      -{p}
                                    </Text>
                                  ))}
                                </View>
                              ) : null}
                              {activity.activity_type === 'gameweek_score' && activity.gameweek_points !== null ? (
                                <Text className="text-xs font-semibold text-teal-300">
                                  {activity.gameweek_points.toLocaleString()} pts scored
                                  {activity.gameweek_rank ? ` · Rank #${activity.gameweek_rank.toLocaleString()}` : ''}
                                </Text>
                              ) : null}
                            </View>
                            <Text className="pt-1 font-bold text-teal-200">›</Text>
                          </Pressable>
                        </Link>
                      );
                    }

                    if (child.type === 'tournament') {
                      const event = child.data;
                      return (
                        <Link key={`t-${event.id}`} href={`/tournament/${event.id}`} asChild>
                          <Pressable
                            className={`flex-row items-start gap-3 rounded-xl ${isNested ? 'p-2.5' : 'p-3'}`}
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: '#f59e0b',
                              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.06)',
                            }}
                          >
                            <SymbolView
                              name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
                              size={17}
                              tintColor="#fbbf24"
                            />
                            <View className="flex-1 gap-1">
                              <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                Tournament active
                              </Text>
                              <Text className="font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {event.title}
                              </Text>
                              <Text className="text-xs leading-5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                {[
                                  event.tier,
                                  `${event.seriesCount} series`,
                                  `${event.matchCount} matches`,
                                  ...(event.bestOfFormats.length ? [`Bo${event.bestOfFormats.join(' / Bo')}`] : []),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </View>
                            <Text className="pt-1 font-bold text-cyan-200">›</Text>
                          </Pressable>
                        </Link>
                      );
                    }

                    // Update
                    const update = child.data;
                    if (update.kind === 'price_change') {
                      return (
                        <Link key={`u-${update.id}`} href={`/player/${update.playerId}`} asChild>
                          <Pressable
                            onPress={() => {
                              void markNotificationRead(update.id).catch(() => {});
                            }}
                            className={`flex-row items-start gap-3 rounded-xl ${isNested ? 'p-2.5' : 'p-3'}`}
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: '#10b981',
                              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(5, 150, 105, 0.06)',
                            }}
                          >
                            <SymbolView
                              name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
                              size={17}
                              tintColor="#34d399"
                            />
                            <View className="flex-1 gap-1">
                              <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                Player price
                              </Text>
                              <Text className="font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {update.title}
                              </Text>
                              <Text className="text-xs leading-5 text-slate-400">{update.message}</Text>
                            </View>
                            <Text className="pt-1 font-bold text-cyan-200">›</Text>
                          </Pressable>
                        </Link>
                      );
                    }

                    if (update.kind === 'availability') {
                      return (
                        <Link key={`u-${update.id}`} href={`/player/${update.playerId}`} asChild>
                          <Pressable
                            onPress={() => {
                              void markNotificationRead(update.id).catch(() => {});
                            }}
                            className={`flex-row items-start gap-3 rounded-xl ${isNested ? 'p-2.5' : 'p-3'}`}
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: '#f43f5e',
                              backgroundColor: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(225, 29, 72, 0.06)',
                            }}
                          >
                            <SymbolView
                              name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
                              size={17}
                              tintColor="#fb7185"
                            />
                            <View className="flex-1 gap-1">
                              <Text className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                                Squad availability
                              </Text>
                              <Text className="font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {update.title}
                              </Text>
                              <Text className="text-xs leading-5 text-slate-400">{update.message}</Text>
                            </View>
                            <Text className="pt-1 font-bold text-cyan-200">›</Text>
                          </Pressable>
                        </Link>
                      );
                    }

                    // Match lifecycle update
                    const presentation = ({
                      live_match: {
                        label: 'Match starting',
                        icon: { ios: 'dot.radiowaves.left.and.right', android: 'radio', web: 'radio' },
                        color: '#22d3ee',
                        border: '#06b6d4',
                        background: isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(8, 145, 178, 0.06)',
                      },
                      match_finished: {
                        label: 'Match finished',
                        icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
                        color: '#34d399',
                        border: '#10b981',
                        background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(5, 150, 105, 0.06)',
                      },
                      match_data_processed: {
                        label: 'Match data processed',
                        icon: { ios: 'chart.bar.doc.horizontal.fill', android: 'analytics', web: 'analytics' },
                        color: '#fbbf24',
                        border: '#f59e0b',
                        background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.06)',
                      },
                      fantasy_points_calculated: {
                        label: 'Fantasy points calculated',
                        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
                        color: '#a78bfa',
                        border: '#8b5cf6',
                        background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(124, 58, 237, 0.06)',
                      },
                    } as const)[update.kind];

                    return (
                      <Link key={`u-${update.id}`} href={`/match/${update.matchId}`} asChild>
                        <Pressable
                          onPress={() => {
                            void markNotificationRead(update.id).catch(() => {});
                          }}
                          className={`flex-row items-start gap-3 rounded-xl ${isNested ? 'p-2.5' : 'p-3'}`}
                          style={{
                            borderLeftWidth: 3,
                            borderLeftColor: presentation.border,
                            backgroundColor: presentation.background,
                          }}
                        >
                          <SymbolView
                            name={presentation.icon}
                            size={17}
                            tintColor={presentation.color}
                          />
                          <View className="flex-1 gap-1">
                            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: presentation.color }}>
                              {presentation.label}
                            </Text>
                            <Text className="font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                              {update.title}
                            </Text>
                            <Text className="text-xs leading-5 text-slate-400">{update.message}</Text>
                          </View>
                          <Text className="pt-1 font-bold" style={{ color: presentation.color }}>›</Text>
                        </Pressable>
                      </Link>
                    );
                  };

                  return (
                    <>
                      {hasGroups && (
                        <View className="flex-row items-center justify-between px-1 pt-1 pb-0.5">
                          <Text className="text-[11px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            {areAllExpanded ? 'All categories expanded' : 'Tap any category to expand'}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            onPress={toggleAllExpanded}
                            hitSlop={8}
                            className="flex-row items-center gap-1"
                          >
                            <Text className="text-[11px] font-semibold text-cyan-400">
                              {areAllExpanded ? 'Collapse all' : 'Expand all'}
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {feedItems.map((item) => {
                        if (item.type === 'group') {
                          const group = item;
                          const theme = getMobileCategoryTheme(group.category, isDark);
                          const isExpanded = Boolean(expandedCategories[group.category]);
                          const updateItems = group.items
                            .filter((i): i is { type: 'update'; data: DashboardUpdate } => i.type === 'update')
                            .map((i) => i.data);

                          return (
                            <View key={`group-${group.category}`} className="gap-2">
                              <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ expanded: isExpanded }}
                                onPress={() => toggleCategory(group.category)}
                                className="flex-row items-center justify-between rounded-xl p-3"
                                style={{
                                  borderLeftWidth: 3,
                                  borderLeftColor: theme.borderColor,
                                  backgroundColor: isExpanded ? theme.expandedBg : theme.bg,
                                }}
                              >
                                <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                                  <SymbolView
                                    name={theme.icon}
                                    size={17}
                                    tintColor={theme.tintColor}
                                  />
                                  <View className="flex-1">
                                    <View className="flex-row items-center gap-1.5 flex-wrap">
                                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.labelColor }}>
                                        {theme.label}
                                      </Text>
                                      <Text className="text-xs text-slate-500">·</Text>
                                      <Text className="text-xs font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                                        {group.title}
                                      </Text>
                                    </View>
                                    <Text className="text-[11px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }} numberOfLines={1}>
                                      {group.preview}
                                    </Text>
                                  </View>
                                </View>

                                <View className="flex-row items-center gap-2">
                                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: theme.pillBg }}>
                                    <Text className="text-[10px] font-bold" style={{ color: theme.pillText }}>
                                      {group.count} updates
                                    </Text>
                                  </View>
                                  <SymbolView
                                    name={
                                      isExpanded
                                        ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
                                        : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
                                    }
                                    size={14}
                                    tintColor={theme.tintColor}
                                  />
                                </View>
                              </Pressable>

                              {isExpanded && (
                                <View className="gap-2 pl-3 ml-2 border-l-2" style={{ borderLeftColor: theme.guideColor }}>
                                  {updateItems.length > 1 && (
                                    <View className="flex-row items-center justify-between py-1 px-1">
                                      <Text className="text-[10px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                        Showing all {group.count} {theme.itemNoun}
                                      </Text>
                                      <Pressable
                                        accessibilityRole="button"
                                        onPress={() => {
                                          void Promise.all(updateItems.map((u) => markNotificationRead(u.id))).catch(() => {});
                                          void whatsNewQuery.refetch();
                                        }}
                                        hitSlop={8}
                                      >
                                        <Text className="text-[10px] font-bold text-cyan-400">Mark all as read</Text>
                                      </Pressable>
                                    </View>
                                  )}
                                  {group.items.map((child) => renderFeedChild(child, true))}
                                </View>
                              )}
                            </View>
                          );
                        }

                        return renderFeedChild(item);
                      })}
                    </>
                  );
                })()}

                {/* Empty states for selected tab */}
                {whatsNewTab === 'friends' && friendActivities.length === 0 ? (
                  <View className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-4 items-center">
                    <Text className="text-sm font-semibold text-slate-300">No friend activity yet</Text>
                    <Text className="mt-1 text-xs text-center text-slate-400">
                      Follow managers on the Friends page to see their transfers and scores here.
                    </Text>
                    <Link href="/friends" asChild>
                      <Pressable className="mt-3 rounded-lg bg-teal-500 px-3 py-1.5">
                        <Text className="text-xs font-bold text-slate-950">Find Friends</Text>
                      </Pressable>
                    </Link>
                  </View>
                ) : null}

                {whatsNewTab === 'squad' && dashboardUpdates.length === 0 ? (
                  <Text className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 text-sm leading-5 text-slate-300 text-center">
                    No squad alerts right now.
                  </Text>
                ) : null}

                {whatsNewTab === 'tournaments' && whatsNewQuery.data.events.length === 0 ? (
                  <Text className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 text-sm leading-5 text-slate-300 text-center">
                    No active tournaments right now.
                  </Text>
                ) : null}

                {whatsNewTab === 'all' &&
                !whatsNewQuery.data.gameweek &&
                whatsNewQuery.data.events.length === 0 &&
                dashboardUpdates.length === 0 &&
                friendActivities.length === 0 ? (
                  <Text className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 text-sm leading-5 text-slate-300">
                    No new events or updates right now.
                  </Text>
                ) : null}
              </View>

              <Link href="/friends" asChild>
                <Pressable accessibilityRole="button" className="min-h-10 flex-row items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10">
                  <Text className="text-sm font-semibold text-teal-200">Open Friends Hub ›</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}
        </View>

        {liveMatchesQuery.data && liveMatchesQuery.data.length > 0 ? (
          <DashboardLiveMatches
            matches={liveMatchesQuery.data}
            ownedPlayers={query.data?.ownedPlayers ?? []}
          />
        ) : null}

        {/* Keep deadline urgency after the activity feed, matching the web dashboard hierarchy. */}
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

        {query.isPending ? (
          <View accessibilityLabel="Loading fantasy dashboard" className="gap-3">
            <View className="h-28 rounded-2xl bg-slate-800" />
            <View className="flex-row gap-3">
              <View className="h-28 flex-1 rounded-2xl bg-slate-800" />
              <View className="h-28 flex-1 rounded-2xl bg-slate-800" />
            </View>
          </View>
        ) : query.isError ? null : query.data ? (
          <>
            <PersonalGoalsProgress
              totalPoints={query.data.totalPoints}
              globalRank={query.data.globalRank}
              targetPoints={query.data.targetPoints}
              targetRank={query.data.targetRank}
            />

            {hasSquad ? (
              <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <View className="min-w-0">
                    <Text className="text-lg font-bold text-white">
                      {squadSummaryQuery.data?.squadName || 'Active Squad'}
                    </Text>
                    <Text className="mt-1 text-xs leading-5 text-slate-400">
                      Gameweek {query.data.gameweek?.gameweekNumber ?? 1} · {starters.length}/5 starters set · Tap a player for score details
                    </Text>
                    <View className="mt-2">
                      <LineupProgress starters={starters.length} />
                    </View>
                </View>
                <View className="flex-row gap-2">
                  <Link href="/team" asChild>
                    <Pressable accessibilityRole="button" className="min-h-10 flex-1 items-center justify-center rounded-lg bg-brand-500 px-3">
                      <Text className="text-xs font-bold text-white">Edit Lineup</Text>
                    </Pressable>
                  </Link>
                  <Link href="/team" asChild>
                    <Pressable accessibilityRole="button" className="min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3">
                      <Text className="text-xs font-semibold text-slate-200">Full Squad</Text>
                    </Pressable>
                  </Link>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Starting Five</Text>
                  <Text className="text-[11px] text-slate-400">Tap a player for score details</Text>
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
                <View className="gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                  <Text className="text-xs font-bold uppercase tracking-wider text-amber-200">Leadership</Text>
                  <View className="flex-row gap-3">
                    <LeadershipEntry role="captain" isDark={isDark} entry={captain} />
                    <LeadershipEntry role="vice" isDark={isDark} entry={viceCaptain} />
                  </View>
                  <CaptainScoringGuide />
                </View>
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
            myLeagues.map((league, leagueIndex) => {
              const standing = league.standings.find((item) => item.userId === session?.user.id);
              const rankChange = getLatestRankChangeForUser(
                leagueActivityQueries[leagueIndex]?.data ?? [],
                session?.user.id,
              );
              const rankDelta = rankChange?.fromRank != null && rankChange.toRank != null
                ? rankChange.fromRank - rankChange.toRank
                : null;
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
                      {rankDelta !== null ? (
                        <Text className={`mt-1 text-[10px] font-semibold ${
                          rankDelta > 0 ? 'text-emerald-300' : rankDelta < 0 ? 'text-rose-300' : 'text-slate-400'
                        }`}>
                          {rankDelta > 0
                            ? `↑ ${rankDelta} place${rankDelta === 1 ? '' : 's'}`
                            : rankDelta < 0
                              ? `↓ ${Math.abs(rankDelta)} place${Math.abs(rankDelta) === 1 ? '' : 's'}`
                              : '— No change'}
                        </Text>
                      ) : null}
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
      {pointsBreakdownOpen ? (
        <DashboardPointsModal
          visible
          onClose={() => setPointsBreakdownOpen(false)}
          currentGameweekId={query.data?.gameweek?.id ?? null}
          currentGameweekNumber={query.data?.gameweek?.gameweekNumber ?? null}
        />
      ) : null}
    </Screen>
  );
}

function HomeStatCard({
  label,
  value,
  detail,
  trendDirection,
  detailIcon,
  detailAccent,
  icon,
  tint,
  onPress,
}: {
  label: string;
  value: string;
  detail: string;
  trendDirection?: 'up' | 'down';
  detailIcon?: ComponentProps<typeof SymbolView>['name'];
  detailAccent?: string;
  icon: ComponentProps<typeof SymbolView>['name'];
  tint: string;
  onPress: () => void;
}) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const detailTint = getDashboardDetailColor({ isDark, direction: trendDirection, accent: detailAccent });
  const detailSymbol: ComponentProps<typeof SymbolView>['name'] | undefined = trendDirection
    ? trendDirection === 'up'
      ? { ios: 'arrow.up.right', android: 'trending_up', web: 'trending_up' }
      : { ios: 'arrow.down.right', android: 'trending_down', web: 'trending_down' }
    : detailIcon;
  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}. ${detail}`}
      accessibilityRole="button"
      className="min-h-32 flex-1 justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-3"
      onPress={onPress}
    >
      <View>
        <View className="mb-3 self-start rounded-xl border border-slate-700 bg-slate-800 p-2">
          <SymbolView name={icon} size={19} tintColor={tint} />
        </View>
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</Text>
        <Text className="mt-1 text-xl font-black text-slate-50">{value}</Text>
      </View>
      <View className="mt-2 min-w-0 flex-row items-center gap-1">
        {detailSymbol ? <SymbolView name={detailSymbol} size={13} tintColor={detailTint} /> : null}
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[10px] font-medium" style={{ color: detailTint }}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

function LeadershipEntry({
  role,
  isDark,
  entry,
}: {
  role: 'captain' | 'vice';
  isDark: boolean;
  entry: FantasyLineupEntry | null;
}) {
  const player = entry?.professional_players;
  const name = player?.in_game_name || player?.name;
  const isCaptain = role === 'captain';
  const accent = isCaptain
    ? isDark ? '#fbbf24' : '#92400e'
    : isDark ? '#2dd4bf' : '#0f766e';
  const icon: ComponentProps<typeof SymbolView>['name'] = isCaptain
    ? { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' }
    : { ios: 'shield.fill', android: 'shield', web: 'shield' };
  return (
    <View className="min-h-20 flex-1 justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <View className="flex-row items-center gap-1.5">
        <SymbolView name={icon} size={13} tintColor={accent} />
        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
          {isCaptain ? 'Captain · 2×' : 'Vice-Captain'}
        </Text>
      </View>
      <Text numberOfLines={1} className={`mt-1 font-semibold ${name ? 'text-slate-50' : 'text-slate-400'}`}>
        {name || 'Not set'}
      </Text>
      {player?.professional_teams?.name ? (
        <Text numberOfLines={1} className="mt-0.5 text-xs text-slate-400">{player.professional_teams.name}</Text>
      ) : null}
    </View>
  );
}
