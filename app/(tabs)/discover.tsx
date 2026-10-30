import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import { PlayerAvatar } from '@/src/components/PlayerAvatar';
import { getPlayers, getProfessionalTeams } from '@/src/features/players/api';
import { useMobileTheme } from '@/src/lib/theme';
import { useFantasyContext } from '@/src/features/fantasy/hooks';
import { getOwnershipPresentation } from '@/src/lib/ownership';

const PAGE_SIZE = 20;
const roles = ['', 'Carry', 'Mid', 'Offlane', 'Support', 'Hard Support'];
type SortField = 'price' | 'ownership' | 'points';

export function getRoleBadgeClass(role: string | null | undefined): { text: string; bg: string; border: string } {
  switch (role) {
    case 'Carry':
      return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' };
    case 'Mid':
      return { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' };
    case 'Offlane':
      return { text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' };
    case 'Support':
      return { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' };
    case 'Hard Support':
      return { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
    default:
      return { text: 'text-brand-300', bg: 'bg-brand-500/10', border: 'border-brand-500/30' };
  }
}

function playerName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors, theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const fantasyContext = useFantasyContext();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [pinOwnedFirst, setPinOwnedFirst] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>('price');
  const [sortDesc, setSortDesc] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [offset, setOffset] = useState(0);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
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

  const activeFilterCount = (search.trim() ? 1 : 0) + (role ? 1 : 0) + (teamId !== null ? 1 : 0);

  const selectedTeamName = teamsQuery.data?.find((t) => t.id === teamId)?.name ?? null;

  const filteredTeams = (teamsQuery.data ?? []).filter((team) =>
    !teamSearch.trim() || team.name.toLowerCase().includes(teamSearch.trim().toLowerCase())
  );

  const clearAllFilters = () => {
    setSearch('');
    setRole('');
    setTeamId(null);
    setOffset(0);
  };

  displayedPlayers.sort((a, b) => {
    if (pinOwnedFirst) {
      const ownedDiff = Number(ownedPlayerIds.has(b.id)) - Number(ownedPlayerIds.has(a.id));
      if (ownedDiff !== 0) return ownedDiff;
    }
    const multiplier = sortDesc ? 1 : -1;
    if (sortBy === 'ownership') {
      const aOwn = a.ownership_percentage ?? 0;
      const bOwn = b.ownership_percentage ?? 0;
      return (bOwn - aOwn) * multiplier;
    }
    if (sortBy === 'points') {
      return ((b.recent_points ?? 0) - (a.recent_points ?? 0)) * multiplier;
    }
    // Default 'price'
    return ((b.current_price ?? 0) - (a.current_price ?? 0)) * multiplier;
  });

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
          <View className="mt-3">
            <DataFreshnessBadge page="players" />
          </View>
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
          <Pressable
            accessibilityRole="button"
            className={`min-h-12 px-3 items-center justify-center rounded-xl border ${compareMode ? 'border-cyan-500 bg-cyan-500/20' : 'border-slate-700 bg-slate-900'
              }`}
            onPress={() => setCompareMode((prev) => !prev)}
          >
            <Text className={`text-xs font-semibold ${compareMode ? 'text-cyan-300' : 'text-slate-300'}`}>
              {compareMode ? 'Exit Compare' : 'Compare'}
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
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
          </View>
          {activeFilterCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              className="min-h-12 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-3"
              onPress={clearAllFilters}
            >
              <Text className="text-xs font-bold text-amber-300">
                Clear ({activeFilterCount})
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Role & Team Dropdowns */}
        <View className="flex-row gap-3">
          {/* Role Dropdown Trigger */}
          <Pressable
            accessibilityRole="combobox"
            accessibilityLabel={`Filter by role. Selected: ${role || 'All roles'}`}
            className={`min-h-11 flex-1 flex-row items-center justify-between rounded-xl border px-3.5 py-2 ${role ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
            onPress={() => setRoleModalVisible(true)}
          >
            <View className="flex-1 mr-2">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role</Text>
              <Text className={`text-sm font-semibold truncate ${role ? 'text-brand-300' : 'text-slate-200'}`} numberOfLines={1}>
                {role || 'All roles'}
              </Text>
            </View>
            <Text className="text-xs text-slate-400">▼</Text>
          </Pressable>

          {/* Team Dropdown Trigger */}
          < Pressable
            accessibilityRole="combobox"
            accessibilityLabel={`Filter by team. Selected: ${selectedTeamName || 'All teams'}`}
            className={`min-h-11 flex-1 flex-row items-center justify-between rounded-xl border px-3.5 py-2 ${teamId !== null ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
              }`}
            onPress={() => {
              setTeamSearch('');
              setTeamModalVisible(true);
            }}
          >
            <View className="flex-1 mr-2">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Team</Text>
              <Text className={`text-sm font-semibold truncate ${teamId !== null ? 'text-brand-300' : 'text-slate-200'}`} numberOfLines={1}>
                {selectedTeamName || 'All teams'}
              </Text>
            </View>
            <Text className="text-xs text-slate-400">▼</Text>
          </Pressable>
        </View>

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
        ) : null}

        {ownedPlayerIds.size ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: pinOwnedFirst }}
            className={`min-h-10 self-start justify-center rounded-full border px-4 ${pinOwnedFirst ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'
              }`}
            onPress={() => setPinOwnedFirst((current) => !current)}
          >
            <Text className={`text-sm font-semibold ${pinOwnedFirst ? 'text-emerald-300' : 'text-slate-300'}`}>
              {pinOwnedFirst ? 'My squad players pinned first' : 'Pin my squad players first'}
            </Text>
          </Pressable>
        ) : null}

        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: availableOnly }}
            className="min-h-10 flex-row items-center gap-2.5 self-start"
            onPress={() => {
              setAvailableOnly((current) => !current);
              setOffset(0);
            }}
          >
            <View className={`h-5 w-5 items-center justify-center rounded border ${availableOnly ? 'border-emerald-400 bg-emerald-500/20' : 'border-slate-600'
              }`}>
              {availableOnly ? <Text className="text-xs font-bold text-emerald-300">✓</Text> : null}
            </View>
            <Text className="text-sm text-slate-300">Available only</Text>
          </Pressable>

          {/* Sort Control */}
          <View className="flex-row items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            {(
              [
                { id: 'price', label: 'Price' },
                { id: 'ownership', label: 'Ownership' },
                { id: 'points', label: 'Form' },
              ] as const
            ).map((opt) => {
              const isActive = sortBy === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${opt.label} ${isActive ? (sortDesc ? 'descending' : 'ascending') : ''}`}
                  className={`flex-row items-center gap-1 rounded-lg px-2.5 py-1 ${isActive ? 'bg-brand-500/20 border border-brand-500/50' : 'border border-transparent'
                    }`}
                  onPress={() => {
                    if (isActive) {
                      setSortDesc((prev) => !prev);
                    } else {
                      setSortBy(opt.id);
                      setSortDesc(true);
                    }
                  }}
                >
                  <Text
                    className={`text-xs font-medium ${isActive ? 'text-brand-300' : 'text-slate-400'
                      }`}
                  >
                    {opt.label}
                  </Text>
                  {isActive ? (
                    <Text className="text-[10px] text-brand-300 font-bold">
                      {sortDesc ? '▼' : '▲'}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

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
              const ownPresentation = getOwnershipPresentation(player.ownership_percentage);
              const ownVal = player.ownership_percentage != null ? `${player.ownership_percentage.toFixed(1)}%` : '—';
              const roleBadge = getRoleBadgeClass(player.primary_role);
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
                        <View className={`mt-2 self-start rounded-md border px-2 py-0.5 ${roleBadge.bg} ${roleBadge.border}`}>
                          <Text className={`text-[10px] font-bold uppercase tracking-wider ${roleBadge.text}`}>
                            {player.primary_role ?? 'Role unavailable'}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end gap-1.5">
                        <View className={`rounded-full px-2.5 py-1 ${player.availability_status === 'available' ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                          }`}>
                          <Text className={`text-xs font-medium ${player.availability_status === 'available' ? 'text-emerald-300' : 'text-amber-200'
                            }`}>
                            {player.availability_status ?? 'Unknown'}
                          </Text>
                        </View>
                        {player.ownership_percentage != null ? (
                          <View className={`rounded-full px-2 py-0.5 ${ownPresentation.badgeBg}`}>
                            <Text className={`text-[10px] font-semibold ${ownPresentation.badgeText}`}>
                              {ownPresentation.label}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text className="text-xs text-slate-400">{player.team_name ?? 'Free agent'}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <PlayerMetric label="Price" value={player.current_price === null ? '—' : `${player.current_price.toFixed(1)}M`} />
                      <PlayerMetric label="Latest" value={`${player.gameweek_points.toFixed(1)} pts`} />
                      <PlayerMetric label="Recent avg" value={`${player.recent_points.toFixed(1)} pts`} />
                      <PlayerMetric label="Ownership" value={ownVal} />
                    </View>

                    {player.ownership_percentage != null ? (
                      <View className="mt-2.5">
                        <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <View
                            style={{
                              width: `${Math.min(100, Math.max(2, player.ownership_percentage))}%`,
                              backgroundColor: ownPresentation.color,
                            }}
                            className="h-full rounded-full"
                          />
                        </View>
                      </View>
                    ) : null}

                    <Text className="mt-3 text-xs font-semibold text-brand-300">View player details</Text>
                  </Pressable>
                  {compareMode ? (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${selectedForCompare ? 'Remove' : 'Add'} ${playerName(player)} ${selectedForCompare ? 'from' : 'to'} comparison`}
                      accessibilityState={{ checked: selectedForCompare, disabled: !selectedForCompare && compareIds.length >= 4 }}
                      className={`min-h-10 items-center justify-center rounded-lg border ${selectedForCompare ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-slate-700'
                        }`}
                      disabled={!selectedForCompare && compareIds.length >= 4}
                      onPress={() => setCompareIds((current) => selectedForCompare
                        ? current.filter((id) => id !== player.id)
                        : [...current, player.id])}
                    >
                      <Text className="text-sm font-medium text-cyan-200">
                        {selectedForCompare ? '✓ In comparison' : '+ Add to comparison'}
                      </Text>
                    </Pressable>
                  ) : null}
                  {player.availability_status === 'available' && !ownedPlayerIds.has(player.id) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${playerName(player)} to your squad`}
                      className="min-h-11 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10"
                      onPress={() => router.push({
                        pathname: '/(tabs)/team',
                        params: {
                          quickAddPlayerId: String(player.id),
                          quickAddPlayerName: playerName(player),
                        },
                      })}
                    >
                      <Text className="text-sm font-semibold text-emerald-300">＋ Add to squad</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
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

      {/* Role Picker Modal */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 }}
          onPress={() => setRoleModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-slate-800 pb-3">
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>Select Player Role</Text>
              <Pressable
                accessibilityRole="button"
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-800"
                onPress={() => setRoleModalVisible(false)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#94a3b8' : '#475569' }}>✕</Text>
              </Pressable>
            </View>
            <View className="gap-2 pt-3">
              {roles.map((item) => {
                const isSelected = role === item;
                const roleBadge = getRoleBadgeClass(item);
                return (
                  <Pressable
                    key={item || 'all'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={`flex-row items-center justify-between rounded-xl border p-3.5 ${isSelected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-800 bg-slate-950/60'
                      }`}
                    onPress={() => {
                      setRole(item);
                      setOffset(0);
                      setRoleModalVisible(false);
                    }}
                  >
                    <View className="flex-row items-center gap-2.5">
                      {item ? (
                        <View className={`rounded-md border px-2 py-0.5 ${roleBadge.bg} ${roleBadge.border}`}>
                          <Text className={`text-[10px] font-bold uppercase tracking-wider ${roleBadge.text}`}>
                            {item}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>All roles</Text>
                      )}
                    </View>
                    {isSelected ? (
                      <Text className="text-sm font-bold text-brand-300">✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Team Picker Modal */}
      <Modal
        visible={teamModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 }}
          onPress={() => setTeamModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#cbd5e1', borderWidth: 1, borderRadius: 24, padding: 20, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-slate-800 pb-3">
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' }}>Select Pro Team</Text>
              <Pressable
                accessibilityRole="button"
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-800"
                onPress={() => setTeamModalVisible(false)}
              >
                <Text className="text-xs font-bold text-slate-400">✕</Text>
              </Pressable>
            </View>

            {/* Team Search inside picker */}
            <TextInput
              accessibilityLabel="Search teams"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ marginTop: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#94a3b8', backgroundColor: isDark ? '#020617' : '#f1f5f9', paddingHorizontal: 14, fontSize: 14, color: isDark ? '#f8fafc' : '#0f172a' }}
              onChangeText={setTeamSearch}
              placeholder="Search team name..."
              placeholderTextColor={colors.placeholder}
              value={teamSearch}
            />

            <ScrollView className="mt-3" showsVerticalScrollIndicator contentContainerClassName="gap-2 pb-2">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: teamId === null }}
                className={`flex-row items-center justify-between rounded-xl border p-3.5 ${teamId === null ? 'border-brand-500 bg-brand-500/15' : 'border-slate-800 bg-slate-950/60'
                  }`}
                onPress={() => {
                  setTeamId(null);
                  setOffset(0);
                  setTeamModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>All teams</Text>
                {teamId === null ? <Text className="text-sm font-bold text-brand-300">✓</Text> : null}
              </Pressable>

              {filteredTeams.map((team) => {
                const isSelected = teamId === team.id;
                return (
                  <Pressable
                    key={team.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={`flex-row items-center justify-between rounded-xl border p-3.5 ${isSelected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-800 bg-slate-950/60'
                      }`}
                    onPress={() => {
                      setTeamId(team.id);
                      setOffset(0);
                      setTeamModalVisible(false);
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#e2e8f0' : '#1e293b' }}>{team.name}</Text>
                    {isSelected ? <Text className="text-sm font-bold text-brand-300">✓</Text> : null}
                  </Pressable>
                );
              })}
              {filteredTeams.length === 0 ? (
                <View className="py-4">
                  <Text style={{ fontSize: 12, textAlign: 'center', color: isDark ? '#94a3b8' : '#475569' }}>No teams found matching &quot;{teamSearch}&quot;</Text>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen >
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
