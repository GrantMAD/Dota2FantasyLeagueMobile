import { Pressable, Text, View } from 'react-native';
import type { MatchSeriesGroup } from './match-series';
import type { MatchSquadAppearance } from './match-squad-appearance';
import { getCompletedGamesAwaitingPlayerStats, summarizeMatchSeries } from './match-series';
import { TeamMatchup } from './TeamMatchup';

interface MatchSeriesCardProps {
  group: MatchSeriesGroup;
  appearance: MatchSquadAppearance;
  onPress: () => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time to be confirmed'
    : date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export function MatchSeriesCard({ group, appearance, onPress }: MatchSeriesCardProps) {
  const { match, games } = group;
  const score = summarizeMatchSeries(games);
  const gamesAwaitingPlayerStats = getCompletedGamesAwaitingPlayerStats(games);
  const completedGame = [...games].reverse().find((game) => game.status === 'completed');
  const displayGame = (
    score.isComplete
      ? completedGame
      : games.find((game) => game.status === 'live')
        ?? games.find((game) => game.status === 'scheduled')
        ?? completedGame
  ) ?? match;
  const hasSquadConnection = appearance.kind !== 'none';
  const isLive = score.isLive && !score.isComplete;
  const statusText = isLive
    ? '● Live'
    : score.isComplete
      ? 'Series Final'
      : displayGame.status;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${match.radiant_team?.name ?? 'team'} versus ${match.dire_team?.name ?? 'team'} series details`}
      accessibilityHint={
        appearance.kind === 'confirmed'
          ? `Your players in this series: ${appearance.playerNames.join(', ')}`
          : appearance.kind === 'unconfirmed'
            ? 'A team in your squad is playing, but player appearances are not confirmed'
            : undefined
      }
      className={`gap-3 rounded-2xl border p-4 ${
        hasSquadConnection
          ? 'border-emerald-500/60 bg-emerald-950/20'
          : isLive
            ? 'border-red-500/60 bg-red-950/20'
            : 'border-slate-800 bg-slate-900'
      }`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className={`text-xs font-semibold uppercase tracking-wider ${
          isLive ? 'text-red-300' : 'text-slate-400'
        }`}>
          {statusText}
        </Text>
        <Text className="text-xs text-slate-500">
          {match.best_of > 1 ? `Best of ${match.best_of}` : `Game ${displayGame.match_number}`}
        </Text>
      </View>

      <TeamMatchup radiantTeam={match.radiant_team} direTeam={match.dire_team} />

      {score.completedGames > 0 ? (
        <View className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2">
          <Text className="text-lg font-black text-emerald-300">{score.radiantWins}</Text>
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Series score · {score.completedGames} {score.completedGames === 1 ? 'game' : 'games'}
          </Text>
          <Text className="text-lg font-black text-rose-300">{score.direWins}</Text>
        </View>
      ) : null}

      {gamesAwaitingPlayerStats.length > 0 ? (
        <Text accessibilityLiveRegion="polite" className="rounded-lg border border-amber-700/60 bg-amber-950/50 px-3 py-2 text-xs leading-5 text-amber-200">
          Player stats for {gamesAwaitingPlayerStats.length} completed {gamesAwaitingPlayerStats.length === 1 ? 'game are' : 'games are'} still being processed.
        </Text>
      ) : null}

      {appearance.kind === 'confirmed' ? (
        <Text className="text-xs font-semibold text-emerald-300">
          Your players in series · {appearance.playerNames.join(', ')}
        </Text>
      ) : appearance.kind === 'unconfirmed' ? (
        <Text className="text-xs font-semibold text-amber-300">
          Squad team fixture · player appearance unconfirmed
        </Text>
      ) : null}

      <Text className="text-sm text-cyan-200">{formatDate(displayGame.scheduled_at)}</Text>
      <View className="flex-row items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <Text numberOfLines={1} className="flex-1 text-xs text-slate-400">
          {match.tournament?.name ?? 'Tournament not announced'}
        </Text>
        <Text className="text-xs text-slate-500">
          {games.length} {games.length === 1 ? 'match' : 'matches'}
        </Text>
      </View>
    </Pressable>
  );
}
