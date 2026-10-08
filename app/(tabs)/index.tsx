import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { SymbolView } from 'expo-symbols';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { MetricCard } from '@/src/components/MetricCard';
import { Screen } from '@/src/components/Screen';
import { getDashboardWhatsNew } from '@/src/features/dashboard/api';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { getLeagues } from '@/src/features/leagues/api';
import { useAuth } from '@/src/lib/auth';

function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

export default function HomeScreen() {
  const query = useFantasyContext();
  const { session } = useAuth();
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
  const myLeagues = (leaguesQuery.data ?? [])
    .filter((league) => league.standings.some((standing) => standing.userId === session?.user.id))
    .slice(0, 3);

  return (
    <Screen>
      <ScrollView
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
              ]);
            }}
            refreshing={query.isRefetching}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy Dota 2</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Your dashboard</Text>
          <Text className="mt-1 text-sm text-slate-400">Your fantasy team, at a glance.</Text>
        </View>

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
            <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="text-sm font-medium text-slate-400">Season points</Text>
              <Text className="mt-2 text-4xl font-bold text-white">{formatMetric(query.data.totalPoints)}</Text>
              <Text className="mt-2 text-sm text-slate-400">
                {query.data.gameweek ? `Gameweek ${query.data.gameweek.gameweekNumber}` : 'Fantasy season'}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <MetricCard label="Budget" value={formatMetric(query.data.budget)} detail="Available funds" />
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
          </>
        ) : (
          <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Text className="font-semibold text-white">No fantasy season yet</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-400">
              Your season details will appear here when they are available.
            </Text>
          </View>
        )}

        <View className="gap-3">
          <Text className="text-xl font-bold text-white">Quick Actions</Text>
          <View className="gap-2">
            {[
              { title: 'Build your squad', description: 'Choose players within your season budget.', href: '/team' as const },
              { title: 'Set your lineup', description: 'Select starters and captaincy for the deadline.', href: '/team' as const },
              { title: 'Check the next deadline', description: 'Review gameweek dates and fixtures.', href: '/gameweeks' as const },
              { title: 'Explore the player market', description: 'Scout form, availability, and value.', href: '/discover' as const },
            ].map((action) => (
              <Link key={action.title} href={action.href} asChild>
                <Pressable className="min-h-16 flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
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
      </ScrollView>
    </Screen>
  );
}
