import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { ChipActivationPanel } from '@/src/features/fantasy/ChipActivationPanel';
import { LineupEditor } from '@/src/features/fantasy/LineupEditor';
import { SquadBuilder } from '@/src/features/fantasy/SquadBuilder';
import { TransferMarket } from '@/src/features/fantasy/TransferMarket';
import { WildcardPanel } from '@/src/features/fantasy/WildcardPanel';
import { WildcardTransferBuilder } from '@/src/features/fantasy/WildcardTransferBuilder';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { useAuth } from '@/src/lib/auth';

export default function TeamScreen() {
  const query = useFantasyContext();
  const { session } = useAuth();
  const lineupByPlayer = useMemo(
    () => new Map((query.data?.lineup ?? []).map((entry) => [entry.player_id, entry])),
    [query.data?.lineup]
  );

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Fantasy Dota 2</Text>
          <Text className="mt-2 text-3xl font-bold text-white">My Team</Text>
          <Text className="mt-1 text-sm text-slate-400">
            {query.data?.gameweek
              ? `Gameweek ${query.data.gameweek.gameweekNumber} · ${query.data.gameweek.status}`
              : 'Your current fantasy squad'}
          </Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading fantasy squad" className="gap-3">
            <View className="h-24 rounded-2xl bg-slate-800" />
            <View className="h-24 rounded-2xl bg-slate-800" />
            <View className="h-24 rounded-2xl bg-slate-800" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Squad unavailable</Text>
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
        ) : query.data && query.data.ownedPlayers.length > 0 ? (
          <>
            {session?.user.id && query.data.ownedPlayers.length < 8 ? (
              <SquadBuilder context={query.data} userId={session.user.id} />
            ) : null}
            {session?.user.id ? (
              <LineupEditor
                key={`${query.data.gameweek?.id ?? 'none'}:${query.data.lineup.map((entry) => `${entry.slot}-${entry.player_id}-${entry.is_captain}-${entry.is_vice_captain}`).join(',')}`}
                context={query.data}
                userId={session.user.id}
              />
            ) : null}
            {session?.user.id ? <ChipActivationPanel context={query.data} userId={session.user.id} /> : null}
            {session?.user.id ? <WildcardPanel context={query.data} userId={session.user.id} /> : null}
            {session?.user.id && query.data.chips.wildcardUsedGameweekId === query.data.gameweek?.id ? (
              <WildcardTransferBuilder
                key={`${query.data.gameweek?.id ?? 'none'}:${query.data.ownedPlayers.map((player) => player.id).sort((a, b) => a - b).join(',')}`}
                context={query.data}
                userId={session.user.id}
              />
            ) : session?.user.id ? (
              <TransferMarket
                key={`${query.data.gameweek?.id ?? 'none'}:${query.data.ownedPlayers.map((player) => player.id).sort((a, b) => a - b).join(',')}`}
                context={query.data}
                userId={session.user.id}
              />
            ) : null}
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">Players</Text>
                <Text className="mt-2 text-2xl font-bold text-white">{query.data.ownedPlayers.length}</Text>
              </View>
              <View className="flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">Lineup set</Text>
                <Text className="mt-2 text-2xl font-bold text-white">{query.data.lineup.length}</Text>
              </View>
            </View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your squad</Text>
            {query.data.ownedPlayers.map((player) => {
              const lineupEntry = lineupByPlayer.get(player.id);
              return (
                <View key={player.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-white">{player.name}</Text>
                      {player.in_game_name ? (
                        <Text className="mt-1 text-sm text-slate-400">{player.in_game_name}</Text>
                      ) : null}
                      <Text className="mt-2 text-xs font-medium uppercase tracking-wider text-brand-400">
                        {player.primary_role?.replaceAll('_', ' ') ?? 'Role unavailable'}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-slate-200">{player.current_price.toFixed(1)}</Text>
                  </View>
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {lineupEntry?.is_starter ? (
                      <Badge label={lineupEntry.slot.replaceAll('_', ' ')} />
                    ) : null}
                    {lineupEntry?.is_captain ? <Badge label="Captain" highlighted /> : null}
                    {lineupEntry?.is_vice_captain ? <Badge label="Vice-captain" highlighted /> : null}
                    {!lineupEntry ? <Badge label="Not in current lineup" /> : null}
                    {player.availability_status ? <Badge label={player.availability_status.replaceAll('_', ' ')} /> : null}
                  </View>
                  <Text className="mt-3 text-xs text-slate-400">
                    Last gameweek {player.last_gw_points} pts · Recent average {player.recent_points} pts
                  </Text>
                </View>
              );
            })}
          </>
        ) : (
          query.data && session?.user.id ? (
            <SquadBuilder context={query.data} userId={session.user.id} />
          ) : (
            <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <Text className="font-semibold text-white">No squad found</Text>
              <Text className="mt-2 text-sm leading-5 text-slate-400">
                Your squad will appear here once it has been created.
              </Text>
            </View>
          )
        )}

        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Updating squad" color="#fb923c" /> : null}
      </ScrollView>
    </Screen>
  );
}

function Badge({ label, highlighted = false }: { label: string; highlighted?: boolean }) {
  return (
    <View className={`rounded-full px-3 py-1 ${highlighted ? 'bg-brand-500/20' : 'bg-slate-800'}`}>
      <Text className={`text-xs font-medium ${highlighted ? 'text-brand-400' : 'text-slate-300'}`}>{label}</Text>
    </View>
  );
}
