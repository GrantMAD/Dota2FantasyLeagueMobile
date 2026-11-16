import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { MatchSummary } from './api';
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

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * A single pulsing dot used for the live game indicator inside SeriesDots.
 */
function PulsingDot() {
  const [anim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <View className="w-2 h-2 items-center justify-center">
      <Animated.View
        style={{ opacity: anim }}
        className="w-2 h-2 rounded-full bg-white"
      />
    </View>
  );
}

/**
 * Row of small coloured dots showing each game outcome in a Bo series.
 * Emerald = Radiant won, Rose = Dire won, pulsing white = live, ghost = future.
 */
function SeriesDots({
  games,
  bestOf,
  radiantTeamId,
}: {
  games: MatchSummary[];
  bestOf: number;
  radiantTeamId: number | null | undefined;
}) {
  const slots: (MatchSummary | null)[] = Array.from({ length: bestOf }, (_, i) => games[i] ?? null);

  return (
    <View className="flex-row items-center gap-1.5" accessibilityLabel="Series game results">
      {slots.map((game, i) => {
        const key = game?.id ?? `empty-${i}`;
        if (!game || game.status === 'scheduled') {
          return (
            <View
              key={key}
              accessibilityLabel={`Game ${i + 1}: not yet played`}
              className="w-2 h-2 rounded-full border border-slate-600 opacity-30"
            />
          );
        }
        if (game.status === 'live' || game.status === 'in_progress') {
          return <PulsingDot key={key} />;
        }
        // completed — colour by winner relative to radiant side
        const radiantWon = game.winner_team_id === radiantTeamId;
        return (
          <View
            key={key}
            accessibilityLabel={`Game ${i + 1}: ${radiantWon ? 'Radiant' : 'Dire'} won`}
            className={`w-2 h-2 rounded-full ${radiantWon ? 'bg-emerald-400' : 'bg-rose-400'}`}
          />
        );
      })}
    </View>
  );
}

/**
 * A pulsing accent line used for the top of live match cards.
 */
function PulsingAccentLine() {
  const [anim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View style={{ opacity: anim }} className="h-[3px] w-full bg-rose-500" />
  );
}

export function MatchSeriesCard({ group, appearance, onPress }: MatchSeriesCardProps) {
  const { match, games } = group;
  const score = summarizeMatchSeries(games);
  const gamesAwaitingPlayerStats = getCompletedGamesAwaitingPlayerStats(games);
  const hasSquadConnection = appearance.kind !== 'none';
  const isLive = score.isLive && !score.isComplete;
  const isCompleted = score.isComplete;
  const isSeries = match.best_of > 1 || games.length > 1;
  const bestOf = match.best_of > 0 ? match.best_of : games.length > 1 ? games.length : 1;
  const hasScore = score.completedGames > 0 || isLive || isCompleted;

  const isRadiantWinner = score.clinchedTeamId === match.radiant_team_id;
  const isDireWinner = score.clinchedTeamId === match.dire_team_id;
  const radiantDim = isCompleted && !isRadiantWinner;
  const direDim = isCompleted && !isDireWinner;

  const displayGame = (
    isCompleted
      ? [...games].reverse().find((game) => game.status === 'completed')
      : games.find((game) => game.status === 'live')
        ?? games.find((game) => game.status === 'scheduled')
        ?? [...games].reverse().find((game) => game.status === 'completed')
  ) ?? match;

  // Card border
  const cardBorderClass = hasSquadConnection
    ? 'border-amber-400/40'
    : isLive
      ? 'border-rose-500/35'
      : 'border-slate-700';

  // Accent line colour (non-live)
  const accentBgClass = isCompleted
    ? 'bg-slate-700'
    : hasSquadConnection
      ? 'bg-amber-400'
      : 'bg-teal-500';

  // Status chip
  const statusChip = isLive ? (
    <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30">
      <View className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      <Text className="text-[11px] font-black uppercase tracking-wide text-rose-400">Live</Text>
    </View>
  ) : isCompleted ? (
    <View className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
      <Text className="text-[11px] font-semibold text-slate-400">
        {isSeries ? 'Series complete' : 'Completed'}
      </Text>
    </View>
  ) : (
    <View className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
      <Text className="text-[11px] font-semibold text-teal-400">
        {formatDateShort(displayGame.scheduled_at)}
      </Text>
    </View>
  );

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
      className={`rounded-2xl border overflow-hidden bg-slate-900 ${cardBorderClass}`}
      onPress={onPress}
    >
      {/* ── Coloured top accent line ── */}
      {isLive ? (
        <PulsingAccentLine />
      ) : (
        <View className={`h-[3px] w-full ${accentBgClass}`} />
      )}

      {/* ── Header: tournament + Bo badge + status chip ── */}
      <View className="flex-row items-center justify-between gap-2 px-4 pt-3 pb-2.5">
        <Text numberOfLines={1} className="flex-1 text-[11px] font-semibold text-slate-400">
          {match.tournament?.name ?? 'Tournament'}
        </Text>
        <View className="flex-row items-center gap-1.5 shrink-0">
          {/* Bo badge */}
          <View className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700">
            <Text className="text-[10px] font-black font-mono text-slate-400">
              {bestOf === 1 ? 'Bo1' : `Bo${bestOf}`}
            </Text>
          </View>
          {statusChip}
        </View>
      </View>

      {/* ── Main matchup area ── */}
      <View className="flex-row items-center px-4 pb-4 gap-2">

        {/* Radiant team */}
        <View
          style={{ opacity: radiantDim ? 0.4 : 1 }}
          className="flex-1 items-center gap-2.5 py-3"
        >
          <TeamMatchup
            radiantTeam={match.radiant_team}
            direTeam={null}
            isRadiantOnly
            isWinner={isRadiantWinner}
            isCompleted={isCompleted}
          />
        </View>

        {/* Centre: score or VS + series dots */}
        <View className="shrink-0 items-center gap-2 px-1">
          {hasScore ? (
            <View className="flex-row items-baseline gap-1">
              <Text
                style={{ fontVariant: ['tabular-nums'] }}
                className={`text-[38px] font-black leading-none ${
                  isRadiantWinner
                    ? 'text-emerald-400'
                    : isCompleted
                      ? 'text-slate-500'
                      : 'text-white'
                }`}
              >
                {score.radiantWins}
              </Text>
              <Text className="text-2xl font-bold text-slate-600 pb-0.5">:</Text>
              <Text
                style={{ fontVariant: ['tabular-nums'] }}
                className={`text-[38px] font-black leading-none ${
                  isDireWinner
                    ? 'text-rose-400'
                    : isCompleted
                      ? 'text-slate-500'
                      : 'text-white'
                }`}
              >
                {score.direWins}
              </Text>
            </View>
          ) : (
            /* VS pill */
            <View className="w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-800 items-center justify-center">
              <Text className="text-xs font-black tracking-widest text-slate-400">VS</Text>
            </View>
          )}

          {/* Bo3/Bo5 series dots */}
          {isSeries && (
            <SeriesDots
              games={games}
              bestOf={bestOf}
              radiantTeamId={match.radiant_team_id}
            />
          )}

          {/* Bo1 — scheduled time below VS */}
          {!isSeries && !hasScore && (
            <Text className="text-[10px] text-slate-500 font-mono">
              {formatTime(displayGame.scheduled_at)}
            </Text>
          )}

          {/* Games played count for in-progress series */}
          {isSeries && !isCompleted && score.completedGames > 0 && (
            <Text className="text-[10px] text-slate-500 font-mono leading-none">
              G{score.completedGames + 1} of {bestOf}
            </Text>
          )}
        </View>

        {/* Dire team */}
        <View
          style={{ opacity: direDim ? 0.4 : 1 }}
          className="flex-1 items-center gap-2.5 py-3"
        >
          <TeamMatchup
            radiantTeam={null}
            direTeam={match.dire_team}
            isDireOnly
            isWinner={isDireWinner}
            isCompleted={isCompleted}
          />
        </View>
      </View>

      {/* ── Stats processing notice ── */}
      {gamesAwaitingPlayerStats.length > 0 ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mx-4 mb-3 rounded-lg border border-amber-700/60 bg-amber-950/50 px-3 py-2 text-xs leading-5 text-amber-200"
        >
          Player stats for {gamesAwaitingPlayerStats.length} completed{' '}
          {gamesAwaitingPlayerStats.length === 1 ? 'game are' : 'games are'} still being processed.
        </Text>
      ) : null}

      {/* ── Footer ── */}
      <View
        className={`flex-row items-center justify-between gap-2 px-4 py-2.5 border-t ${
          hasSquadConnection
            ? 'border-amber-400/30 bg-amber-400/10'
            : 'border-slate-800 bg-slate-800/60'
        }`}
      >
        {hasSquadConnection ? (
          /* Squad info — amber tint footer */
          <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
            <Text className="text-amber-400 text-xs">★</Text>
            <Text numberOfLines={1} className="text-[11px] font-bold text-amber-300 flex-1">
              {appearance.kind === 'confirmed' ? 'Appeared' : 'Fixture'}
              {appearance.playerNames.length > 0
                ? ` · ${appearance.playerNames.join(', ')}`
                : ''}
            </Text>
          </View>
        ) : (
          /* Date/time info */
          <Text className="text-[11px] text-slate-500 flex-1">
            {isCompleted
              ? formatDateShort(displayGame.scheduled_at)
              : !hasScore
                ? formatDate(displayGame.scheduled_at)
                : isLive
                  ? 'In progress'
                  : `${formatDateShort(displayGame.scheduled_at)} · ${formatTime(displayGame.scheduled_at)}`}
          </Text>
        )}

        <Text className={`text-[11px] font-semibold shrink-0 ${hasSquadConnection ? 'text-amber-500' : 'text-slate-500'}`}>
          {games.length > 1 ? 'View Series' : 'View Match'} ›
        </Text>
      </View>
    </Pressable>
  );
}
