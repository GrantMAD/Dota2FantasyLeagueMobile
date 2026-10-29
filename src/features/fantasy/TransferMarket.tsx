import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { FantasyContext, FantasyPlayer, MarketPlayer, TransferSuggestion } from './api';
import { getPlayerMarket, getTransferHistory, getTransferSuggestions, processTransfer } from './api';
import { getPlayers, getProfessionalTeams } from '@/src/features/players/api';
import { PriceSparkline } from '@/src/components/PriceSparkline';
import { useMobileTheme } from '@/src/lib/theme';
import { getOwnershipPresentation } from '@/src/lib/ownership';
import { DifferentialScoutPanel } from '@/src/components/DifferentialScoutPanel';

interface TransferMarketProps {
  context: FantasyContext;
  userId: string;
  quickAddPlayerId?: number;
  quickAddPlayerName?: string;
}

function normalizeRole(role: string | null): string {
  return role?.trim().toLowerCase().replaceAll(' ', '_') ?? '';
}

function matchesRole(incoming: MarketPlayer, outgoing: FantasyPlayer): boolean {
  return Boolean(
    normalizeRole(incoming.primary_role) &&
    normalizeRole(incoming.primary_role) === normalizeRole(outgoing.primary_role)
  );
}

function playerName(player: { in_game_name: string | null; name: string }): string {
  return player.in_game_name || player.name;
}

export function TransferMarket({
  context,
  userId,
  quickAddPlayerId,
  quickAddPlayerName,
}: TransferMarketProps) {
  const queryClient = useQueryClient();
  const { colors, theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isTeamPickerVisible, setIsTeamPickerVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'points' | 'ownership'>('price');
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedOutId, setSelectedOutId] = useState<number | null>(null);
  const [selectionOverride, setSelectionOverride] = useState<{
    quickAddId: number | undefined;
    playerId: number | null;
  } | null>(null);
  const [suggestedSelection, setSuggestedSelection] = useState<TransferSuggestion | null>(null);
  const [dismissedQuickAddId, setDismissedQuickAddId] = useState<number | null>(null);
  const [showDifferentialFeedback, setShowDifferentialFeedback] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const ownedIds = useMemo(
    () => new Set(context.ownedPlayers.map((player) => player.id)),
    [context.ownedPlayers]
  );
  const selectedInId = selectionOverride ? selectionOverride.playerId : null;
  const selectedOut = context.ownedPlayers.find((player) => player.id === selectedOutId) ?? null;

  const marketQuery = useQuery({
    queryKey: ['player-market', deferredSearch, selectedTeamId],
    queryFn: () => getPlayerMarket(deferredSearch, selectedTeamId),
    enabled: context.ownedPlayers.length > 0 && selectedTeamId !== null,
    staleTime: 60_000,
  });
  const scoutPlayersQuery = useQuery({
    queryKey: ['scout-recommendations-players'],
    queryFn: () => getPlayers({ search: '', role: '', teamId: null, availableOnly: true, offset: 0, limit: 50 }),
    enabled: context.ownedPlayers.length > 0,
    staleTime: 60_000,
  });
  const scoutPlayersList = scoutPlayersQuery.data?.players;
  const scoutCandidatePlayers: MarketPlayer[] = useMemo(() => {
    if (!scoutPlayersList?.length) return [];
    return scoutPlayersList.map((p) => ({
      id: p.id,
      name: p.name,
      in_game_name: p.in_game_name,
      primary_role: p.primary_role,
      profile_image_url: p.profile_image_url,
      availability_status: p.availability_status,
      professional_teams: p.team_name ? { id: 0, name: p.team_name, logo_url: null } : null,
      current_price: p.current_price,
      ownership_percentage: p.ownership_percentage ?? null,
      recent_points: p.recent_points,
    } as MarketPlayer));
  }, [scoutPlayersList]);
  const professionalTeamsQuery = useQuery({
    queryKey: ['professional-teams'],
    queryFn: getProfessionalTeams,
    enabled: context.ownedPlayers.length > 0,
    staleTime: 5 * 60_000,
  });
  const selectedTeamName = selectedTeamId === null
    ? 'Choose a team'
    : professionalTeamsQuery.data?.find((team) => team.id === selectedTeamId)?.name ?? 'Select a team';
  const suggestionsQuery = useQuery({
    queryKey: ['transfer-suggestions', context.fantasySeasonId, context.ownedPlayers.map((player) => player.id).join(',')],
    queryFn: getTransferSuggestions,
    enabled: Boolean(context.fantasySeasonId && context.ownedPlayers.length > 0),
    staleTime: 60_000,
  });
  const activeQuickAddPlayerId = suggestedSelection?.playerInId ?? quickAddPlayerId;
  const activeQuickAddPlayerName = suggestedSelection?.playerInName ?? quickAddPlayerName;
  const quickAddQuery = useQuery({
    queryKey: ['player-market-quick-add', activeQuickAddPlayerId, activeQuickAddPlayerName, selectedTeamId],
    queryFn: () => getPlayerMarket(activeQuickAddPlayerName ?? '', selectedTeamId),
    enabled: Boolean(activeQuickAddPlayerId && activeQuickAddPlayerName && selectedTeamId !== null),
    staleTime: 60_000,
  });
  const historyQuery = useQuery({
    queryKey: ['transfer-history', userId],
    queryFn: getTransferHistory,
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const transferMutation = useMutation({
    mutationFn: processTransfer,
    onSuccess: async (result) => {
      Alert.alert(
        'Transfer completed',
        `Your squad has been updated. Penalty: ${result.penaltyPoints} points.`
      );
      setSelectedOutId(null);
      setSuggestedSelection(null);
      setSelectionOverride({ quickAddId: quickAddPlayerId, playerId: null });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] }),
        queryClient.invalidateQueries({ queryKey: ['transfer-suggestions', context.fantasySeasonId] }),
        queryClient.invalidateQueries({ queryKey: ['transfer-history', userId] }),
        queryClient.invalidateQueries({ queryKey: ['transfer-history-analytics', userId] }),
      ]);
    },
  });

  const quickAddPlayer = selectedTeamId === null
    ? null
    : quickAddQuery.data?.find((player) => player.id === activeQuickAddPlayerId) ?? null;
  const incomingPlayers = (selectedTeamId === null ? [] : marketQuery.data ?? []).filter((player) => {
    if (ownedIds.has(player.id) || player.availability_status !== 'available') return false;
    return !selectedOut || matchesRole(player, selectedOut);
  });
  const visibleIncomingPlayers = selectedTeamId === null ? [] : [
    ...(quickAddPlayer &&
      !ownedIds.has(quickAddPlayer.id) &&
      quickAddPlayer.availability_status === 'available' &&
      (!selectedOut || matchesRole(quickAddPlayer, selectedOut))
      ? [quickAddPlayer]
      : []),
    ...incomingPlayers.filter((player) => player.id !== quickAddPlayer?.id),
  ];
  const sortedIncomingPlayers = [
    ...visibleIncomingPlayers.filter((player) => player.id === quickAddPlayer?.id),
    ...visibleIncomingPlayers
      .filter((player) => player.id !== quickAddPlayer?.id)
      .sort((left, right) => {
        const leftValue = sortBy === 'price'
          ? left.current_price
          : sortBy === 'points'
            ? left.recent_points
            : left.ownership_percentage;
        const rightValue = sortBy === 'price'
          ? right.current_price
          : sortBy === 'points'
            ? right.recent_points
            : right.ownership_percentage;
        const difference = (rightValue ?? -Infinity) - (leftValue ?? -Infinity);
        return (sortDescending ? difference : -difference) ||
          playerName(left).localeCompare(playerName(right));
      }),
  ];
  const quickAddIsSelectable = Boolean(
    quickAddPlayer &&
    !ownedIds.has(quickAddPlayer.id) &&
    quickAddPlayer.availability_status === 'available' &&
    (!selectedOut || matchesRole(quickAddPlayer, selectedOut))
  );
  const quickAddIsSelected = Boolean(
    quickAddIsSelectable &&
    selectedInId === null &&
    activeQuickAddPlayerId !== dismissedQuickAddId
  );
  const selectedIn = visibleIncomingPlayers.find(
    (player) => player.id === (selectedInId ?? (quickAddIsSelected ? quickAddPlayerId : null))
  ) ?? scoutCandidatePlayers.find((p) => p.id === (selectedInId ?? (quickAddIsSelected ? quickAddPlayerId : null))) ?? null;
  const canTransfer = Boolean(
    context.fantasySeasonId &&
    !context.gameweek?.isLocked &&
    selectedOut &&
    selectedIn &&
    selectedIn.current_price !== null &&
    selectedOut.id !== selectedIn.id
  );

  function requestTransferConfirmation() {
    if (!canTransfer || !selectedOut || !selectedIn || !context.fantasySeasonId) return;
    Alert.alert(
      'Confirm transfer',
      `Transfer out ${playerName(selectedOut)} and bring in ${playerName(selectedIn)}? The server will validate budget, deadline, and transfer penalties.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm transfer',
          onPress: () => transferMutation.mutate({
            fantasySeasonId: context.fantasySeasonId!,
            transfersIn: [selectedIn.id],
            transfersOut: [selectedOut.id],
          }),
        },
      ]
    );
  }

  return (
    <View className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <SymbolView
            name={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
            size={20}
            tintColor={isDark ? '#34d399' : '#047857'}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-bold text-slate-50">Transfer market</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Choose one player to sell and an available player in the same role. The server calculates your budget and transfer penalty.
          </Text>
        </View>
      </View>

      {context.gameweek?.isLocked ? (
        <View accessibilityRole="alert" className="rounded-xl border border-amber-800 bg-amber-950 p-3">
          <Text className="text-sm font-medium text-amber-100">Transfers are locked for this gameweek.</Text>
        </View>
      ) : null}

      <View className="gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4">
        <View>
          <Text className="text-base font-bold text-white">Smart transfer suggestions</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-300">
            Role-matched swaps based on recent scoring, price movement, your budget, and squad limits.
            Suggestions are advisory; the transfer server checks the final transaction.
          </Text>
        </View>
        {selectedTeamId === null ? (
          <Text className="text-sm leading-5 text-slate-400">
            Choose a professional team below to view transfer recommendations.
          </Text>
        ) : suggestionsQuery.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading transfer suggestions" color="#14b8a6" />
        ) : suggestionsQuery.isError ? (
          <View className="gap-2">
            <Text accessibilityRole="alert" className="text-sm text-red-300">
              {suggestionsQuery.error instanceof Error
                ? suggestionsQuery.error.message
                : 'Transfer suggestions could not be loaded.'}
            </Text>
            <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => void suggestionsQuery.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : suggestionsQuery.data?.recommendations.length ? (
          suggestionsQuery.data.recommendations.map((suggestion) => (
            <View
              key={`${suggestion.playerOutId}-${suggestion.playerInId}`}
              className="gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3"
            >
              <Text className="text-sm font-semibold text-white">
                <Text className="text-rose-300">{suggestion.playerOutName}</Text>
                <Text className="text-slate-500"> → </Text>
                <Text className="text-emerald-300">{suggestion.playerInName}</Text>
              </Text>
              <Text className="text-xs text-slate-400">
                {suggestion.playerInRole} · {suggestion.playerInCurrentPrice.toFixed(1)}M ·
                {' '}estimated bank after swap {suggestion.budgetAfter.toFixed(1)}M
              </Text>
              {suggestion.reasons.map((reason) => (
                <Text key={reason} className="text-xs leading-5 text-slate-300">• {reason}</Text>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={transferMutation.isPending}
                className="min-h-11 items-center justify-center rounded-lg bg-indigo-500/20 px-3"
                onPress={() => {
                  setSelectedOutId(suggestion.playerOutId);
                  setSuggestedSelection(suggestion);
                  setSelectionOverride({
                    quickAddId: quickAddPlayerId,
                    playerId: suggestion.playerInId,
                  });
                  setDismissedQuickAddId(null);
                  transferMutation.reset();
                }}
              >
                <Text className="text-xs font-semibold text-indigo-200">Select this swap</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View className="gap-2">
            {suggestionsQuery.data &&
            suggestionsQuery.data.status !== 'no_fantasy_season' &&
            suggestionsQuery.data.status !== 'no_open_gameweek' &&
            suggestionsQuery.data.status !== 'no_squad' &&
            suggestionsQuery.data.completedGameweeks < suggestionsQuery.data.requiredGameweeks ? (
              <Text className="text-sm leading-5 text-slate-300">
                More scoring history is needed: {suggestionsQuery.data.completedGameweeks} of
                {' '}{suggestionsQuery.data.requiredGameweeks} gameweeks are complete.
              </Text>
            ) : null}
            {suggestionsQuery.data &&
            suggestionsQuery.data.status !== 'no_fantasy_season' &&
            suggestionsQuery.data.status !== 'no_open_gameweek' &&
            suggestionsQuery.data.status !== 'no_squad' &&
            suggestionsQuery.data.pricedRoleMatchedCandidates === 0 ? (
              <Text className="text-sm leading-5 text-slate-300">
                No available same-role replacements have a price recorded for the upcoming gameweek yet.
              </Text>
            ) : null}
            {suggestionsQuery.data?.status === 'no_squad' ? (
              <Text className="text-sm leading-5 text-slate-300">
                Build your squad before getting transfer suggestions.
              </Text>
            ) : null}
            {suggestionsQuery.data?.status === 'no_open_gameweek' ? (
              <Text className="text-sm leading-5 text-slate-300">
                Suggestions are unavailable because there is no gameweek currently open for transfers.
              </Text>
            ) : null}
            {suggestionsQuery.data?.status === 'no_fantasy_season' ? (
              <Text className="text-sm leading-5 text-slate-300">
                Join a fantasy season and build your squad to get transfer suggestions.
              </Text>
            ) : null}
            {suggestionsQuery.data?.status === 'no_recommendations' ? (
              <Text className="text-sm leading-5 text-slate-300">
                No swaps currently meet the budget, form, price-trend, and team-limit criteria.
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Differential Scout & Recommendations */}
      <DifferentialScoutPanel
        candidates={scoutCandidatePlayers.length ? scoutCandidatePlayers : (marketQuery.data ?? [])}
        selectedPlayerInId={selectedInId ?? (quickAddIsSelected ? quickAddPlayerId ?? null : null)}
        isLocked={false}
        onSelectPlayerIn={(scoutPlayer) => {
          setSuggestedSelection(null);
          setSelectionOverride({
            quickAddId: undefined,
            playerId: scoutPlayer.id,
          });
          setDismissedQuickAddId(null);
          setShowDifferentialFeedback(true);
          transferMutation.reset();
          Alert.alert(
            'Player selected for transfer',
            `${scoutPlayer.in_game_name || scoutPlayer.name} has been added to your trade.\n\nPlease make sure you select an outgoing player in the same position, then scroll down to the Trade Review area to confirm.`,
            [{ text: 'Got it' }]
          );
        }}
      />

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select player to sell</Text>
        {context.ownedPlayers.map((player) => {
          const selected = player.id === selectedOutId;
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityLabel={`Sell ${playerName(player)}, ${player.primary_role ?? 'role unavailable'}, ${player.current_price.toFixed(1)} million`}
              accessibilityState={{ selected }}
              className={`min-h-20 flex-row items-center gap-3 rounded-xl border p-3 ${
                selected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
              }`}
              disabled={transferMutation.isPending}
              onPress={() => {
                const nextSelectedOut = selected ? null : player.id;
                setSelectedOutId(nextSelectedOut);
                if (
                  quickAddPlayer &&
                  quickAddIsSelected &&
                  nextSelectedOut !== null &&
                  !matchesRole(quickAddPlayer, player)
                ) {
                  setDismissedQuickAddId(quickAddPlayer.id);
                }
                transferMutation.reset();
              }}
            >
              <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-slate-800">
                {player.profile_image_url ? (
                  <Image
                    accessibilityLabel={`${playerName(player)} avatar`}
                    source={{ uri: player.profile_image_url }}
                    className="h-12 w-12"
                  />
                ) : (
                  <Text className="text-base font-bold text-slate-200">
                    {playerName(player).slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="min-w-0 flex-1 font-semibold text-slate-50" numberOfLines={1}>
                    {playerName(player)}
                  </Text>
                  {selected ? (
                    <View className="rounded-full bg-brand-500/20 px-2 py-1">
                      <Text className="text-[10px] font-semibold text-brand-300">Selected</Text>
                    </View>
                  ) : null}
                </View>
                {player.professional_teams?.name ? (
                  <Text className="mt-0.5 text-xs text-slate-400" numberOfLines={1}>
                    {player.professional_teams.name}
                  </Text>
                ) : null}
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  <View className="rounded-full bg-cyan-500/10 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-cyan-300">
                      {player.primary_role ?? 'Role unavailable'}
                    </Text>
                  </View>
                  <View className="rounded-full bg-slate-800 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-slate-300">
                      {player.current_price.toFixed(1)}M
                    </Text>
                  </View>
                  {player.availability_status ? (
                    <View className="rounded-full bg-emerald-500/10 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-emerald-300">
                        {player.availability_status.replaceAll('_', ' ')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Search replacement</Text>
        <TextInput
          accessibilityLabel="Search available players"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
          editable={!transferMutation.isPending}
          onChangeText={(value) => {
            setSearch(value);
            setSuggestedSelection(null);
            setSelectionOverride({ quickAddId: quickAddPlayerId, playerId: null });
            setDismissedQuickAddId(null);
          }}
          placeholder={selectedOut ? `Search ${selectedOut.primary_role ?? 'players'}` : 'Select a player to sell first'}
          placeholderTextColor={colors.placeholder}
          value={search}
        />
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Filter by professional team
          </Text>
          {professionalTeamsQuery.isPending ? (
            <ActivityIndicator accessibilityLabel="Loading professional teams" color="#14b8a6" />
          ) : professionalTeamsQuery.isError ? (
            <View className="gap-1">
              <Text accessibilityRole="alert" className="text-sm text-red-300">
                {professionalTeamsQuery.error instanceof Error
                  ? professionalTeamsQuery.error.message
                  : 'Professional teams could not be loaded.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                className="min-h-10 justify-center self-start"
                onPress={() => void professionalTeamsQuery.refetch()}
              >
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter by professional team"
                accessibilityState={{ expanded: isTeamPickerVisible }}
                className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4"
                onPress={() => setIsTeamPickerVisible(true)}
              >
                <Text className={`text-sm font-semibold ${selectedTeamId === null ? 'text-slate-300' : 'text-brand-300'}`}>
                  {selectedTeamName}
                </Text>
                <SymbolView
                  name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                  size={18}
                  tintColor={isDark ? '#5eead4' : '#0f766e'}
                />
              </Pressable>
              {selectedTeamId !== null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear professional team filter"
                  className="min-h-9 flex-row items-center justify-center self-start gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3"
                  style={{
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  }}
                  onPress={() => setSelectedTeamId(null)}
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={13}
                    tintColor={isDark ? '#cbd5e1' : '#475569'}
                  />
                  <Text className="text-xs font-semibold" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                    Clear
                  </Text>
                </Pressable>
              ) : (
                <Text className="text-xs text-slate-500">
                  No team filter is applied until you choose one.
                </Text>
              )}
              <Modal
                accessibilityViewIsModal
                animationType="fade"
                onRequestClose={() => setIsTeamPickerVisible(false)}
                presentationStyle="overFullScreen"
                statusBarTranslucent
                transparent
                visible={isTeamPickerVisible}
              >
                <View
                  className="flex-1 justify-center px-5"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: isDark ? 'rgba(2, 6, 23, 0.82)' : 'rgba(15, 23, 42, 0.55)',
                  }}
                >
                  <View
                    className="gap-3 rounded-2xl border p-4"
                    style={{
                      maxHeight: '70%',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      backgroundColor: isDark ? '#020617' : '#ffffff',
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-lg font-bold"
                        style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                      >
                        Select professional team
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        className="min-h-10 justify-center px-2"
                        onPress={() => setIsTeamPickerVisible(false)}
                      >
                        <Text className="font-semibold" style={{ color: isDark ? '#5eead4' : '#0f766e' }}>
                          Close
                        </Text>
                      </Pressable>
                    </View>
                    <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                      {(professionalTeamsQuery.data ?? []).map((team) => {
                        const selected = team.id === selectedTeamId;
                        return (
                          <Pressable
                            key={team.id ?? 'all-teams'}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            className="min-h-12 flex-row items-center justify-between rounded-xl border px-4"
                            style={{
                              borderColor: selected
                                ? isDark ? '#14b8a6' : '#0f766e'
                                : isDark ? '#334155' : '#cbd5e1',
                              backgroundColor: selected
                                ? isDark ? 'rgba(20, 184, 166, 0.16)' : '#ccfbf1'
                                : isDark ? '#0f172a' : '#f8fafc',
                            }}
                            onPress={() => {
                              setSelectedTeamId(team.id);
                              setIsTeamPickerVisible(false);
                            }}
                          >
                            <Text
                              className="text-sm font-semibold"
                              style={{
                                color: selected
                                  ? isDark ? '#5eead4' : '#115e59'
                                  : isDark ? '#f8fafc' : '#0f172a',
                              }}
                            >
                              {team.name}
                            </Text>
                            {selected ? (
                              <SymbolView
                                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                                size={18}
                                tintColor={isDark ? '#5eead4' : '#0f766e'}
                              />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          )}
        </View>
        <View className="gap-2">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sort by</Text>
          <View className="flex-row gap-2">
            {([
              ['price', 'Price'],
              ['points', 'Recent form'],
              ['ownership', 'Ownership'],
            ] as const).map(([key, label]) => {
              const selected = sortBy === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (selected) setSortDescending((current) => !current);
                    else {
                      setSortBy(key);
                      setSortDescending(true);
                    }
                  }}
                  className={`min-h-10 flex-1 items-center justify-center rounded-full border px-2 ${
                    selected ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 bg-slate-950'
                  }`}
                  style={{
                    borderColor: selected ? (isDark ? '#f59e0b' : '#d97706') : (isDark ? '#334155' : '#cbd5e1'),
                    backgroundColor: selected
                      ? (isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb')
                      : (isDark ? '#020617' : '#ffffff'),
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="text-xs font-medium"
                    style={{ color: selected ? (isDark ? '#fde68a' : '#92400e') : (isDark ? '#94a3b8' : '#475569') }}
                  >
                    {label}{selected ? (sortDescending ? ' ↓' : ' ↑') : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {selectedTeamId === null ? (
          <Text className="py-3 text-sm leading-5 text-slate-400">
            Choose a professional team above to see eligible replacement players.
          </Text>
        ) : marketQuery.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading players" color="#14b8a6" />
        ) : marketQuery.isError ? (
          <View className="gap-2">
            <Text accessibilityRole="alert" className="text-sm text-red-300">
              {marketQuery.error instanceof Error ? marketQuery.error.message : 'Player market unavailable.'}
            </Text>
            <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => void marketQuery.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : visibleIncomingPlayers.length > 0 ? (
          <>
          {quickAddQuery.isError ? (
            <View className="gap-1">
              <Text accessibilityRole="alert" className="text-sm text-red-300">
                {quickAddQuery.error instanceof Error ? quickAddQuery.error.message : 'Unable to load the selected player.'}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void quickAddQuery.refetch()}>
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : null}
          {quickAddPlayer && selectedOut && !matchesRole(quickAddPlayer, selectedOut) ? (
            <Text className="text-sm leading-5 text-amber-200">
              The selected player does not match the role of the player you are selling.
            </Text>
          ) : null}
              {sortedIncomingPlayers.slice(0, 12).map((player) => {
                const isQuickAdd = player.id === activeQuickAddPlayerId;
                const selected = player.id === selectedIn?.id;
                const ownPres = getOwnershipPresentation(player.ownership_percentage);
                return (
                  <Pressable
                    key={player.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-24 flex-row items-center gap-3 rounded-xl border p-3 ${
                      selected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
                    }`}
                    style={{
                      borderColor: selected ? (isDark ? '#14b8a6' : '#0f766e') : (isDark ? '#334155' : '#cbd5e1'),
                      backgroundColor: selected
                        ? (isDark ? 'rgba(20, 184, 166, 0.14)' : '#f0fdfa')
                        : (isDark ? '#020617' : '#ffffff'),
                    }}
                    disabled={!selectedOut || transferMutation.isPending}
                    onPress={() => {
                      if (isQuickAdd) {
                        setSelectionOverride({ quickAddId: quickAddPlayerId, playerId: null });
                        setDismissedQuickAddId(selected ? player.id : null);
                      } else {
                        setSelectionOverride({
                          quickAddId: quickAddPlayerId,
                          playerId: selected ? null : player.id,
                        });
                        setDismissedQuickAddId(null);
                      }
                      transferMutation.reset();
                    }}
                  >
                    <View
                      className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border"
                      style={{
                        borderColor: isDark ? '#475569' : '#cbd5e1',
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      }}
                    >
                      {player.profile_image_url ? (
                        <Image
                          accessibilityLabel={`${playerName(player)} avatar`}
                          source={{ uri: player.profile_image_url }}
                          className="h-12 w-12"
                        />
                      ) : (
                        <Text className="text-base font-bold" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                          {playerName(player).slice(0, 1).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View className="min-w-0 flex-1 gap-1.5">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text
                          className="min-w-0 flex-1 font-semibold"
                          style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                          numberOfLines={1}
                        >
                          {playerName(player)}
                        </Text>
                        {player.ownership_percentage != null ? (
                          <View className={`rounded-full px-2 py-0.5 ${ownPres.badgeBg}`}>
                            <Text className={`text-[10px] font-semibold ${ownPres.badgeText}`}>
                              {`${player.ownership_percentage.toFixed(1)}%`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {player.professional_teams?.name ? (
                        <Text className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }} numberOfLines={1}>
                          {player.professional_teams.name}
                        </Text>
                      ) : null}
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : '#ecfeff' }}
                        >
                          <Text className="text-[10px] font-semibold" style={{ color: isDark ? '#67e8f9' : '#0e7490' }}>
                            {player.primary_role ?? 'Role unavailable'}
                          </Text>
                        </View>
                        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                          <Text className="text-[10px] font-semibold" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                            {player.current_price === null ? 'Price unavailable' : `${player.current_price.toFixed(1)}M`}
                          </Text>
                        </View>
                        {player.recent_points !== null ? (
                          <View
                            className="rounded-full px-2 py-0.5"
                            style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5' }}
                          >
                            <Text className="text-[10px] font-semibold" style={{ color: isDark ? '#6ee7b7' : '#047857' }}>
                              Form {player.recent_points} pts
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {selected || (player.price_history && player.price_history.length > 0) ? (
                        <View className="flex-row items-center justify-between">
                          {selected ? (
                            <Text className="text-[10px] font-semibold text-brand-300">
                              Selected as replacement
                            </Text>
                          ) : <View />}
                          {player.price_history && player.price_history.length > 0 ? (
                            <PriceSparkline data={player.price_history} width={48} height={15} />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
          </>
        ) : (
          <Text className="py-3 text-sm leading-5 text-slate-400">
            {selectedOut ? 'No available players match this role and search.' : 'Choose a player to sell to see eligible replacements.'}
          </Text>
        )}
      </View>

      {showDifferentialFeedback && (!selectedOut || !selectedIn) ? (
        <View className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 gap-1.5">
          <Text className="text-xs font-bold text-amber-300">
            ★ Transfer In Selected: {!selectedOut ? 'Now choose a player to sell above to complete the trade' : 'Review details below'}
          </Text>
          <Text className="text-xs text-slate-300">
            Once both outgoing and incoming players match role and budget requirements, confirm the trade below.
          </Text>
        </View>
      ) : null}

      {selectedOut && selectedIn && selectedIn.current_price !== null ? (
        <View className="gap-1 rounded-xl border border-cyan-900/60 bg-cyan-950/30 p-3">
          <Text className="text-sm font-semibold text-cyan-100">
            Estimated bank after swap: {(context.budget + selectedOut.current_price - selectedIn.current_price).toFixed(1)}M
          </Text>
          <Text className="text-xs leading-5 text-slate-300">
            {context.freeTransfers > 0
              ? `${context.freeTransfers} free transfer${context.freeTransfers === 1 ? '' : 's'} available.`
              : 'No free transfers remain; a transfer hit may apply.'}
            {' '}The server confirms the final budget and any penalty before updating your squad.
          </Text>
        </View>
      ) : null}
      {transferMutation.error ? (
        <Text accessibilityRole="alert" className="text-sm leading-5 text-red-300">
          {transferMutation.error.message}
        </Text>
      ) : null}
      {transferMutation.isPending ? (
        <View className="flex-row items-center justify-center gap-2 py-2">
          <ActivityIndicator color="#14b8a6" />
          <Text className="text-sm text-slate-300">Processing transfer</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canTransfer || transferMutation.isPending }}
          className={`min-h-12 items-center justify-center rounded-xl bg-brand-500 ${
            canTransfer ? 'active:opacity-80' : 'opacity-50'
          }`}
          disabled={!canTransfer}
          onPress={requestTransferConfirmation}
        >
          <Text className="font-bold text-white">Review transfer</Text>
        </Pressable>
      )}

      <View className="border-t border-slate-800 pt-4">
        <Text className="text-base font-semibold text-white">Recent transfers</Text>
        {historyQuery.isPending ? (
          <ActivityIndicator accessibilityLabel="Loading transfer history" className="mt-3" color="#14b8a6" />
        ) : historyQuery.isError ? (
          <View className="mt-2 gap-2">
            <Text accessibilityRole="alert" className="text-sm text-red-300">
              {historyQuery.error instanceof Error ? historyQuery.error.message : 'Transfer history unavailable.'}
            </Text>
            <Pressable accessibilityRole="button" className="min-h-10 justify-center self-start" onPress={() => void historyQuery.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : historyQuery.data?.length ? (
          <View className="mt-3 gap-3">
            {historyQuery.data.slice(0, 5).map((entry) => (
              <View key={entry.id} className="rounded-xl bg-slate-950 p-3">
                <Text className="text-xs font-medium text-slate-400">
                  {entry.gameweekNumber ? `Gameweek ${entry.gameweekNumber}` : 'Transfer'} · {new Date(entry.createdAt).toLocaleDateString()}
                </Text>
                {entry.moves.map((move, index) => (
                  <Text key={`${entry.id}-${index}`} className="mt-2 text-sm text-slate-200">
                    {move.playerOut ?? '—'} → {move.playerIn ?? '—'}
                  </Text>
                ))}
                {entry.penaltyPoints !== null ? (
                  <Text className="mt-1 text-xs text-slate-400">Penalty: {entry.penaltyPoints} pts</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-2 text-sm text-slate-400">No transfer history yet.</Text>
        )}
      </View>
    </View>
  );
}
