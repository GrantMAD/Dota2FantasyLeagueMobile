import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Share, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/src/components/Screen';
import { getSeasonRecaps, type SeasonRecap } from '@/src/features/season-recap/api';

function formatSeasonDates(start: string | null, end: string | null): string {
  const format = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };
  return [format(start), format(end)].filter((value): value is string => value !== null).join(' – ') || 'Dates unavailable';
}

function privacySafeSummary(recap: SeasonRecap): string {
  const details = [
    `Season points: ${recap.totalPoints.toFixed(1)}`,
    recap.finalGlobalRank !== null ? `Global finish: #${recap.finalGlobalRank}` : null,
    recap.bestGameweek ? `Best gameweek: GW ${recap.bestGameweek.gameweek} (${recap.bestGameweek.points.toFixed(1)} points)` : null,
    recap.topPlayer ? `Top-scoring pick: ${recap.topPlayer.name} (${recap.topPlayer.points.toFixed(1)} points)` : null,
    recap.rankProgression
      ? `Rank progress: #${recap.rankProgression.startingRank} to #${recap.rankProgression.finalRank}`
      : null,
    recap.bestLeagueRank !== null ? `Best league finish: #${recap.bestLeagueRank}` : null,
    `Transfers: ${recap.transferCount}`,
  ].filter((item): item is string => item !== null);
  return `My ${recap.seasonName} Fantasy recap\n${details.join('\n')}\n\nShared without manager name or account details.`;
}

export default function SeasonRecapScreen() {
  const [sharingConsent, setSharingConsent] = useState(false);
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['season-recaps'],
    queryFn: getSeasonRecaps,
    staleTime: 60_000,
  });

  async function shareRecap(recap: SeasonRecap) {
    if (!sharingConsent || sharingId !== null) return;
    setSharingId(recap.fantasySeasonId);
    setShareError(null);
    setShareMessage(null);
    try {
      await Share.share({
        title: `${recap.seasonName} recap`,
        message: privacySafeSummary(recap),
      });
      setShareMessage('Your privacy-safe recap was shared.');
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Unable to share this recap.');
    } finally {
      setSharingId(null);
    }
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Look back</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Season recap</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Finished seasons, standout gameweeks, and your top-scoring picks.
          </Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading season recaps" className="items-center py-12">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Season recaps unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load season recaps.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : query.data.length === 0 ? (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-lg font-semibold text-white">Your season recap will appear here</Text>
            <Text className="text-center text-sm leading-5 text-slate-400">
              A recap becomes available after a season ends and its gameweeks are finalized.
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sharingConsent }}
                className="flex-row items-start gap-3"
                onPress={() => setSharingConsent((current) => !current)}
              >
                <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                  sharingConsent ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-600'
                }`}>
                  {sharingConsent ? <Text className="text-xs font-bold text-cyan-200">✓</Text> : null}
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-white">I choose to share a privacy-safe recap</Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-400">
                    Sharing includes results and selected player statistics only—not your manager name, account details,
                    squad name, league name, or a public link.
                  </Text>
                </View>
              </Pressable>
            </View>
            {shareError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{shareError}</Text> : null}
            {shareMessage ? <Text accessibilityRole="alert" className="text-sm text-cyan-300">{shareMessage}</Text> : null}
            {query.data.map((recap) => (
              <View key={recap.fantasySeasonId} className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Season recap</Text>
                  <Text className="mt-1 text-xl font-bold text-white">{recap.seasonName}</Text>
                  <Text className="mt-1 text-sm text-slate-400">{formatSeasonDates(recap.startDate, recap.endDate)}</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <View className="min-w-[46%] flex-1 rounded-xl bg-slate-950 p-3">
                    <Text className="text-xs text-slate-500">Season points</Text>
                    <Text className="mt-1 text-xl font-bold text-white">{recap.totalPoints.toFixed(1)}</Text>
                  </View>
                  <View className="min-w-[46%] flex-1 rounded-xl bg-slate-950 p-3">
                    <Text className="text-xs text-slate-500">Global finish</Text>
                    <Text className="mt-1 text-xl font-bold text-white">
                      {recap.finalGlobalRank !== null ? `#${recap.finalGlobalRank}` : 'Not ranked'}
                    </Text>
                  </View>
                  <View className="min-w-[46%] flex-1 rounded-xl bg-slate-950 p-3">
                    <Text className="text-xs text-slate-500">Best gameweek</Text>
                    <Text className="mt-1 text-base font-bold text-white">
                      {recap.bestGameweek
                        ? `GW ${recap.bestGameweek.gameweek} · ${recap.bestGameweek.points.toFixed(1)} pts`
                        : 'No score recorded'}
                    </Text>
                  </View>
                  <View className="min-w-[46%] flex-1 rounded-xl bg-slate-950 p-3">
                    <Text className="text-xs text-slate-500">Transfers</Text>
                    <Text className="mt-1 text-xl font-bold text-white">{recap.transferCount}</Text>
                  </View>
                </View>
                <View className="gap-2 border-t border-slate-800 pt-3">
                  {recap.topPlayer ? (
                    <View className="flex-row justify-between gap-3">
                      <Text className="text-sm text-slate-400">Top-scoring pick</Text>
                      <Text numberOfLines={1} className="flex-1 text-right font-semibold text-white">
                        {recap.topPlayer.name} · {recap.topPlayer.points.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                  {recap.rankProgression ? (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-slate-400">Rank progress</Text>
                      <Text className="font-semibold text-white">
                        #{recap.rankProgression.startingRank} → #{recap.rankProgression.finalRank}
                      </Text>
                    </View>
                  ) : null}
                  {recap.bestLeagueRank !== null ? (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-slate-400">Best league finish</Text>
                      <Text className="font-semibold text-white">#{recap.bestLeagueRank}</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !sharingConsent || sharingId !== null }}
                  className={`min-h-12 items-center justify-center rounded-xl border px-4 ${
                    sharingConsent ? 'border-cyan-700/60 bg-cyan-950/40' : 'border-slate-700 bg-slate-950'
                  }`}
                  disabled={!sharingConsent || sharingId !== null}
                  onPress={() => void shareRecap(recap)}
                >
                  <Text className={`font-semibold ${sharingConsent ? 'text-cyan-200' : 'text-slate-500'}`}>
                    {sharingId === recap.fantasySeasonId ? 'Opening share sheet…' : 'Share privacy-safe recap'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
