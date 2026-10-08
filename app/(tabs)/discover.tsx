import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { getPlayers, getProfessionalTeams } from '@/src/features/players/api';
import { useMobileTheme } from '@/src/lib/theme';
import { useFantasyContext } from '@/src/features/fantasy/hooks';

const PAGE_SIZE = 20;
const roles = ['', 'Carry', 'Mid', 'Offlane', 'Support', 'Hard Support'];

function playerName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors } = useMobileTheme();
  const fantasyContext = useFantasyContext();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [pinOwnedFirst, setPinOwnedFirst] = useState(false);
  const [offset, setOffset] = useState(0);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const deferredSearch = useDeferredValue(search);
  const teamsQuery = useQuery({
    queryKey: ['professional-teams'],
    queryFn: getProfessionalTeams,
    staleTime: 30 * 60_000,
  });
  const query = useQuery({
    queryKey: ['player-directory', deferredSearch, role, teamId, availableOnly, offset],
    queryFn: () => getPlayers({
      search: deferredSearch,
      role,
      teamId,
      availableOnly,
      offset,
      limit: PAGE_SIZE,
    }),
    staleTime: 60_000,
  });
  const hasMore = Boolean(
    query.data &&
    query.data.total !== null &&
    query.data.offset + query.data.players.length < query.data.total
  );
  const ownedPlayerIds = new Set((fantasyContext.data?.ownedPlayers ?? []).map((player) => player.id));
  const displayedPlayers = (query.data?.players ?? []).filter((player) =>
    !availableOnly || player.availability_status === 'available'
  );
  if (pinOwnedFirst) {
    displayedPlayers.sort((a, b) => Number(ownedPlayerIds.has(b.id)) - Number(ownedPlayerIds.has(a.id)));
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor="#14b8a6"
          />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Player directory</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Discover</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
              Search professional players by name and role, view their season form, or compare up to four players.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Link href="/matches" asChild>
            <Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-cyan-700/60 bg-cyan-950/30">
              <Text className="font-semibold text-cyan-200">Match Center</Text>
            </Pressable>
          </Link>
          <Link href="/tournaments" asChild>
            <Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
              <Text className="font-semibold text-slate-200">Tournaments</Text>
            </Pressable>
          </Link>
        </View>

        <TextInput
          accessibilityLabel="Search players"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-white"
          onChangeText={(value) => {
            setSearch(value);
            setOffset(0);
          }}
          placeholder="Search player or in-game name"
          placeholderTextColor={colors.placeholder}
          value={search}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {roles.map((item) => (
            <Pressable
              key={item || 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: role === item }}
              className={`min-h-10 justify-center rounded-full border px-4 ${
                role === item ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
              onPress={() => {
                setRole(item);
                setOffset(0);
              }}
            >
              <Text className={`text-sm font-semibold ${role === item ? 'text-brand-300' : 'text-slate-300'}`}>
                {item || 'All roles'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {teamsQuery.isError ? (
          <View accessibilityRole="alert" className="gap-2 rounded-xl border border-amber-900 bg-amber-950/60 p-3">
            <Text className="text-sm text-amber-200">
              Team filters are unavailable: {teamsQuery.error instanceof Error
                ? teamsQuery.error.message
                : 'Unable to load teams.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void teamsQuery.refetch()}>
              <Text className="font-semibold text-white">Retry team list</Text>
            </Pressable>
          </View>
        ) : teamsQuery.data?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {[{ id: null, name: 'All teams' }, ...teamsQuery.data].map((team) => (
              <Pressable
                key={team.id ?? 'all-teams'}
                accessibilityRole="button"
                accessibilityState={{ selected: teamId === team.id }}
                className={`min-h-10 justify-center rounded-full border px-4 ${
                  teamId === team.id ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
                }`}
                onPress={() => {
                  setTeamId(team.id);
                  setOffset(0);
                }}
              >
                <Text className={`text-sm font-semibold ${teamId === team.id ? 'text-brand-300' : 'text-slate-300'}`}>
                  {team.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {ownedPlayerIds.size ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: pinOwnedFirst }}
            className={`min-h-10 self-start justify-center rounded-full border px-4 ${
              pinOwnedFirst ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'
            }`}
            onPress={() => setPinOwnedFirst((current) => !current)}
          >
            <Text className={`text-sm font-semibold ${pinOwnedFirst ? 'text-emerald-300' : 'text-slate-300'}`}>
              {pinOwnedFirst ? 'My squad players pinned first' : 'Pin my squad players first'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: availableOnly }}
          className="min-h-10 flex-row items-center gap-3 self-start"
          onPress={() => {
            setAvailableOnly((current) => !current);
            setOffset(0);
          }}
        >
          <View className={`h-5 w-5 items-center justify-center rounded border ${
            availableOnly ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-600'
          }`}>
            {availableOnly ? <Text className="text-xs font-bold text-emerald-300">✓</Text> : null}
          </View>
          <Text className="text-sm text-slate-300">Available players only</Text>
        </Pressable>

        {query.isPending ? (
          <View accessibilityLabel="Loading players" className="gap-3">
            {[1, 2, 3].map((item) => (
              <View key={item} className="h-28 rounded-2xl border border-slate-800 bg-slate-900" />
            ))}
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Players unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load the player directory.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : displayedPlayers.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-sm text-slate-300">
              {query.data.players.length > 0 && availableOnly
                ? 'No available players on this page. Continue to see more results.'
                : 'No players match these filters.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {`${displayedPlayers.length} shown on this page`}
            </Text>
            {displayedPlayers.map((player) => {
              const selectedForCompare = compareIds.includes(player.id);
              return (
              <View key={player.id} className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${playerName(player)} details`}
                  onPress={() => router.push(`/player/${player.id}`)}
                >
                <View className="flex-row items-start justify-between gap-3">
                  <PlayerAvatar uri={player.profile_image_url} label={playerName(player)} size={48} />
                  <View className="flex-1">
                    <Text className="font-semibold text-white">{playerName(player)}</Text>
                    {player.in_game_name && player.name !== player.in_game_name ? (
                      <Text className="mt-1 text-xs text-slate-400">{player.name}</Text>
                    ) : null}
                    <Text className="mt-2 text-xs font-medium uppercase tracking-wider text-brand-300">
                      {player.primary_role ?? 'Role unavailable'}
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${
                    player.availability_status === 'available' ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      player.availability_status === 'available' ? 'text-emerald-300' : 'text-amber-200'
                    }`}>
                      {player.availability_status ?? 'Unknown'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-400">{player.team_name ?? 'Free agent'}</Text>
                <View className="flex-row flex-wrap gap-2">
                  <PlayerMetric label="Price" value={player.current_price === null ? '—' : `${player.current_price.toFixed(1)}M`} />
                  <PlayerMetric label="Latest" value={`${player.gameweek_points.toFixed(1)} pts`} />
                  <PlayerMetric label="Recent avg" value={`${player.recent_points.toFixed(1)} pts`} />
                </View>
                <Text className="mt-3 text-xs font-semibold text-brand-300">View player details</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${selectedForCompare ? 'Remove' : 'Add'} ${playerName(player)} ${selectedForCompare ? 'from' : 'to'} comparison`}
                  accessibilityState={{ checked: selectedForCompare, disabled: !selectedForCompare && compareIds.length >= 4 }}
                  className={`min-h-10 items-center justify-center rounded-lg border ${
                    selectedForCompare ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-slate-700'
                  }`}
                  disabled={!selectedForCompare && compareIds.length >= 4}
                  onPress={() => setCompareIds((current) => selectedForCompare
                    ? current.filter((id) => id !== player.id)
                    : [...current, player.id])}
                >
                  <Text className="text-sm font-medium text-cyan-200">
                    {selectedForCompare ? 'Remove from comparison' : 'Add to comparison'}
                  </Text>
                </Pressable>
              </View>
            );})}
          </View>
        )}

        {compareIds.length >= 2 ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-cyan-700"
            onPress={() => router.push(`/compare-players?ids=${compareIds.join(',')}`)}
          >
            <Text className="font-bold text-white">Compare {compareIds.length} players</Text>
          </Pressable>
        ) : compareIds.length === 1 ? (
          <Text className="text-center text-xs text-slate-400">Select one more player to compare.</Text>
        ) : null}

        {query.isSuccess && (hasMore || offset > 0) ? (
          <View className="flex-row gap-3">
            {offset > 0 ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900"
                onPress={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              >
                <Text className="font-semibold text-slate-200">Previous</Text>
              </Pressable>
            ) : null}
            {hasMore ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-11 flex-1 items-center justify-center rounded-xl border border-brand-500/50 bg-brand-500/10"
                onPress={() => setOffset((current) => current + PAGE_SIZE)}
              >
                <Text className="font-semibold text-brand-200">Next players</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {query.isRefetching ? <ActivityIndicator accessibilityLabel="Refreshing players" color="#14b8a6" /> : null}
      </ScrollView>
    </Screen>
  );
}

function PlayerMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-20 rounded-lg bg-slate-950 px-3 py-2">
      <Text className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</Text>
      <Text className="mt-1 text-xs font-semibold text-slate-200">{value}</Text>
    </View>
  );
}
