import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SymbolView } from 'expo-symbols';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { DataFreshnessBadge } from '@/src/components/DataFreshnessBadge';
import {
  createLeague,
  getLeagues,
  joinLeague,
  type CreateLeagueInput,
  type LeagueFixture,
  type LeagueStanding,
} from '@/src/features/leagues/api';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

type FormMode = 'create' | 'join' | null;
type LeagueFilter = 'all' | 'classic' | 'h2h';

function ChoiceButton({
  label,
  selected,
  onPress,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-10 ${compact ? 'flex-none' : 'flex-1'} items-center justify-center rounded-xl border px-3 ${
        selected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
      }`}
      onPress={onPress}
    >
      <Text numberOfLines={1} className={`text-sm font-semibold ${selected ? 'text-brand-300' : 'text-slate-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function LeaguesScreen() {
  const { session } = useAuth();
  const { colors } = useMobileTheme();
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<{
    leagueName: string;
    manager: LeagueStanding;
  } | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<{
    leagueName: string;
    fixture: LeagueFixture;
  } | null>(null);
  const [inviteCopied, setInviteCopied] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CreateLeagueInput['type']>('classic');
  const [privacyLevel, setPrivacyLevel] = useState<CreateLeagueInput['privacyLevel']>('private');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [inviteCode, setInviteCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['leagues'],
    queryFn: getLeagues,
    staleTime: 60_000,
  });
  const refreshLeagues = () => queryClient.invalidateQueries({ queryKey: ['leagues'] });
  const createMutation = useMutation({
    mutationFn: createLeague,
    onSuccess: async (result) => {
      setFormMode(null);
      setName('');
      setDescription('');
      setFormError(null);
      setSuccessMessage(result.message);
      await refreshLeagues();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Unable to create the league.'),
  });
  const joinMutation = useMutation({
    mutationFn: joinLeague,
    onSuccess: async (result) => {
      setFormMode(null);
      setInviteCode('');
      setFormError(null);
      setSuccessMessage(result.message);
      await refreshLeagues();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Unable to join the league.'),
  });

  const myLeagues = (query.data ?? [])
    .filter((league) => league.standings.some((standing) => standing.userId === session?.user.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const classicLeagues = myLeagues.filter((league) => league.type === 'classic');
  const h2hLeagues = myLeagues.filter((league) => league.type === 'h2h');
  const visibleLeagues = leagueFilter === 'all'
    ? myLeagues
    : myLeagues.filter((league) => league.type === leagueFilter);
  const heroLeague = [...myLeagues].sort((a, b) => b.currentParticipants - a.currentParticipants)[0] ?? null;
  const submitting = createMutation.isPending || joinMutation.isPending;

  async function copyInviteCode(code: string) {
    try {
      await Clipboard.setStringAsync(code);
      setInviteCopied(code);
      setInviteError(null);
      setSuccessMessage(`Invite code ${code} copied.`);
    } catch (error) {
      setInviteError(error instanceof Error ? `Unable to copy invite code: ${error.message}` : 'Unable to copy invite code.');
    }
  }

  function submitCreate() {
    const participantLimit = Number(maxParticipants);
    if (!name.trim()) {
      setFormError('Enter a league name.');
      return;
    }
    if (!Number.isInteger(participantLimit) || participantLimit < 4 || participantLimit > 32) {
      setFormError('Maximum participants must be between 4 and 32.');
      return;
    }
    setFormError(null);
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      type,
      privacyLevel,
      maxParticipants: participantLimit,
    });
  }

  function submitJoin() {
    if (!inviteCode.trim()) {
      setFormError('Enter the league invite code.');
      return;
    }
    setFormError(null);
    joinMutation.mutate(inviteCode.trim());
  }

  function openForm(mode: Exclude<FormMode, null>) {
    setFormError(null);
    setFormMode(mode);
  }

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-5"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#14b8a6" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Competitive circuits</Text>
          <Text className="mt-2 text-3xl font-bold text-slate-50">Leagues</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Follow your classic standings and head-to-head fixtures, or create a league and invite your friends.
          </Text>
          <View className="mt-3">
            <DataFreshnessBadge page="leagues" />
          </View>
        </View>

        {successMessage ? (
          <View accessibilityRole="alert" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <Text className="text-sm font-semibold text-emerald-300">{successMessage}</Text>
          </View>
        ) : null}
        {inviteError ? (
          <Text accessibilityRole="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {inviteError}
          </Text>
        ) : null}

        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-500 px-4"
            onPress={() => openForm('create')}
          >
            <Text className="font-bold text-on-accent">Create league</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
            onPress={() => openForm('join')}
          >
            <Text className="font-semibold text-slate-50">Join with code</Text>
          </Pressable>
        </View>

        {formMode ? (
          <View className="gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-50">{formMode === 'create' ? 'Create a league' : 'Join a league'}</Text>
              <Pressable accessibilityRole="button" onPress={() => setFormMode(null)}>
                <Text className="font-semibold text-slate-400">Cancel</Text>
              </Pressable>
            </View>
            {formMode === 'create' ? (
              <>
                <TextInput
                  accessibilityLabel="League name"
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-slate-50"
                  maxLength={80}
                  onChangeText={setName}
                  placeholder="League name"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                />
                <TextInput
                  accessibilityLabel="League description"
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-slate-50"
                  maxLength={280}
                  multiline
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.placeholder}
                  value={description}
                />
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Format</Text>
                <View className="flex-row gap-2">
                  <ChoiceButton label="Classic" selected={type === 'classic'} onPress={() => setType('classic')} />
                  <ChoiceButton label="Head-to-head" selected={type === 'h2h'} onPress={() => setType('h2h')} />
                </View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Privacy</Text>
                <View className="flex-row gap-2">
                  <ChoiceButton label="Private" selected={privacyLevel === 'private'} onPress={() => setPrivacyLevel('private')} />
                  <ChoiceButton label="Public" selected={privacyLevel === 'public'} onPress={() => setPrivacyLevel('public')} />
                </View>
                <TextInput
                  accessibilityLabel="Maximum participants"
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-slate-50"
                  keyboardType="number-pad"
                  onChangeText={setMaxParticipants}
                  placeholder="Maximum participants (4–32)"
                  placeholderTextColor={colors.placeholder}
                  value={maxParticipants}
                />
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4"
                  disabled={submitting}
                  onPress={submitCreate}
                >
                  <Text className="font-bold text-on-accent">{submitting ? 'Creating…' : 'Create league'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-sm leading-5 text-slate-400">
                  Enter the invite code from the league creator. Codes are not case-sensitive.
                </Text>
                <TextInput
                  accessibilityLabel="League invite code"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-base text-slate-50"
                  onChangeText={(value) => setInviteCode(value.toUpperCase())}
                  placeholder="ABC-1234"
                  placeholderTextColor={colors.placeholder}
                  value={inviteCode}
                />
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4"
                  disabled={submitting}
                  onPress={submitJoin}
                >
                  <Text className="font-bold text-on-accent">{submitting ? 'Joining…' : 'Join league'}</Text>
                </Pressable>
              </>
            )}
            {formError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{formError}</Text> : null}
          </View>
        ) : null}

        {heroLeague ? (
          <Link href={`/league/${heroLeague.id}`} asChild>
            <Pressable
              accessibilityRole="button"
              className="gap-3 rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4"
            >
              <Text className="text-xs font-semibold uppercase tracking-wider text-brand-300">League overview</Text>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-slate-50">{heroLeague.name}</Text>
                  <Text className="mt-1 text-sm text-slate-300">
                    {heroLeague.type === 'h2h' ? 'Head-to-head' : 'Classic'} · {heroLeague.privacyLevel}
                  </Text>
                </View>
                <Text className="font-bold text-brand-300">
                  {heroLeague.currentParticipants}/{heroLeague.maxParticipants}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-slate-800">
                <View
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.min(100, (heroLeague.currentParticipants / heroLeague.maxParticipants) * 100)}%` }}
                />
              </View>
              <Text className="text-xs text-slate-400">
                {heroLeague.currentParticipants} of {heroLeague.maxParticipants} manager slots filled · Open league
              </Text>
            </Pressable>
          </Link>
        ) : null}

        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }}
              size={19}
              tintColor="#2dd4bf"
              accessibilityLabel="Your leagues"
            />
            <Text className="text-xl font-bold text-slate-50">Your leagues</Text>
          </View>
          <Text className="text-sm text-slate-400">
            {myLeagues.length} joined · {classicLeagues.length} Classic · {h2hLeagues.length} Head-to-head
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {([
            { value: 'all', label: `All ${myLeagues.length}` },
            { value: 'classic', label: `Classic ${classicLeagues.length}` },
            { value: 'h2h', label: `Head-to-head ${h2hLeagues.length}` },
          ] as const).map((filter) => (
            <ChoiceButton
              key={filter.value}
              label={filter.label}
              selected={leagueFilter === filter.value}
              compact
              onPress={() => setLeagueFilter(filter.value)}
            />
          ))}
        </ScrollView>

        {query.isPending ? (
          <View accessibilityLabel="Loading leagues" className="items-center py-10">
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Leagues unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load your leagues.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-slate-50">Try again</Text>
            </Pressable>
          </View>
        ) : myLeagues.length ? (
          visibleLeagues.length ? (
          <View className="gap-3">
            {visibleLeagues.map((league) => {
              const ownStanding = league.standings.find((standing) => standing.userId === session?.user.id);
              const leaders = league.standings.slice(0, 3);
              return (
                <Link key={league.id} href={`/league/${league.id}`} asChild>
                  <Pressable
                    accessibilityRole="button"
                    className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-bold text-slate-50">{league.name}</Text>
                        <Text className="mt-1 text-xs text-slate-400">
                          {league.type === 'h2h' ? 'Head-to-head' : 'Classic'} · {league.privacyLevel}
                        </Text>
                      </View>
                      <Text className="text-xs font-semibold uppercase text-brand-300">
                        {league.currentParticipants}/{league.maxParticipants}
                      </Text>
                    </View>
                    <Text className="text-sm text-slate-300">
                      {ownStanding?.rank ? `Rank ${ownStanding.rank} · ` : ''}{ownStanding?.points ?? 0} points
                      {league.type === 'h2h' && ownStanding
                        ? ` · ${ownStanding.wins}W ${ownStanding.draws}D ${ownStanding.losses}L`
                        : ''}
                    </Text>
                    {league.description ? (
                      <Text numberOfLines={2} className="text-xs leading-5 text-slate-400">{league.description}</Text>
                    ) : null}
                    <Text className="text-xs font-semibold text-cyan-300">View standings and fixtures →</Text>
                    {leaders.length ? (
                      <View className="gap-2 border-t border-slate-800 pt-3">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {league.type === 'h2h' ? 'League leaders' : 'Top standings'}
                        </Text>
                        {leaders.map((standing, index) => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View ${standing.manager} profile`}
                            className="flex-row items-center justify-between gap-3"
                            key={standing.userId}
                            onPress={(event) => {
                              event.stopPropagation();
                              setSelectedManager({ leagueName: league.name, manager: standing });
                            }}
                          >
                            <Text numberOfLines={1} className="flex-1 text-sm text-slate-300">
                              {standing.rank ?? index + 1}. {standing.manager}
                            </Text>
                            <Text className="text-xs font-semibold text-slate-400">{standing.points} pts</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {league.privacyLevel === 'private' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Copy invite code for ${league.name}`}
                        className="min-h-10 flex-row items-center justify-between rounded-lg border border-slate-700 px-3"
                        onPress={(event) => {
                          event.stopPropagation();
                          void copyInviteCode(league.inviteCode);
                        }}
                      >
                        <Text className="text-xs font-semibold text-slate-300">
                          Invite: {inviteCopied === league.inviteCode ? 'Copied' : league.inviteCode}
                        </Text>
                        <Text className="text-xs font-semibold text-brand-300">Copy</Text>
                      </Pressable>
                    ) : null}
                  </Pressable>
                </Link>
              );
            })}
          </View>
          ) : (
            <Text className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-5 text-center text-sm text-slate-400">
              No {leagueFilter === 'h2h' ? 'head-to-head' : 'classic'} leagues yet.
            </Text>
          )
        ) : (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-base font-semibold text-slate-50">You have not joined a league yet</Text>
            <Text className="text-center text-sm leading-5 text-slate-400">
              Create a league or join one with an invite code to see its standings here.
            </Text>
          </View>
        )}

        {h2hLeagues.length ? (
          <View className="gap-3">
            <View>
              <Text className="text-xl font-bold text-slate-50">Head-to-head arena</Text>
              <Text className="mt-1 text-sm text-slate-400">Recent fixtures from your H2H leagues.</Text>
            </View>
            {h2hLeagues.flatMap((league) => league.fixtures.slice(0, 2).map((fixture) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View gameweek ${fixture.gameweekId} matchup in ${league.name}`}
                className="gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4"
                key={`${league.id}-${fixture.id}`}
                onPress={() => setSelectedFixture({ leagueName: league.name, fixture })}
              >
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {league.name} · Gameweek {fixture.gameweekId}{fixture.isBye ? ' · Bye' : ''}
                </Text>
                <View className="flex-row items-center justify-between gap-3">
                  <Text numberOfLines={1} className="flex-1 font-medium text-slate-50">{fixture.home}</Text>
                  <Text className="font-bold text-cyan-200">{fixture.homePoints} – {fixture.awayPoints}</Text>
                  <Text numberOfLines={1} className="flex-1 text-right font-medium text-slate-50">{fixture.away}</Text>
                </View>
              </Pressable>
            )))}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        accessibilityViewIsModal
        animationType="slide"
        onRequestClose={() => {
          setSelectedManager(null);
          setSelectedFixture(null);
        }}
        transparent
        visible={selectedManager !== null || selectedFixture !== null}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="gap-4 rounded-t-3xl border border-slate-700 bg-slate-950 p-6">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                  {selectedManager ? 'Manager profile' : 'Fixture details'}
                </Text>
                <Text accessibilityRole="header" className="mt-1 text-xl font-bold text-slate-50">
                  {selectedManager?.manager.manager ?? selectedFixture?.leagueName}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close details" onPress={() => {
                setSelectedManager(null);
                setSelectedFixture(null);
              }}>
                <Text className="text-lg font-semibold text-slate-300">Close</Text>
              </Pressable>
            </View>
            {selectedManager ? (
              <>
                {selectedManager.manager.username ? (
                  <Text className="text-sm text-slate-400">@{selectedManager.manager.username}</Text>
                ) : null}
                {selectedManager.manager.bio ? (
                  <Text className="text-sm leading-5 text-slate-300">{selectedManager.manager.bio}</Text>
                ) : null}
                <Text className="text-sm text-slate-300">
                  {selectedManager.leagueName} · {selectedManager.manager.points} points · {selectedManager.manager.gameweekPoints} GW
                </Text>
                {selectedManager.manager.wins + selectedManager.manager.draws + selectedManager.manager.losses > 0 ? (
                  <Text className="text-sm text-slate-400">
                    {selectedManager.manager.wins} wins · {selectedManager.manager.draws} draws · {selectedManager.manager.losses} losses
                  </Text>
                ) : null}
              </>
            ) : selectedFixture ? (
              <>
                <Text className="text-sm text-slate-400">
                  {selectedFixture.leagueName} · Gameweek {selectedFixture.fixture.gameweekId}
                </Text>
                <Text className="text-lg font-semibold text-slate-50">
                  {selectedFixture.fixture.home} {selectedFixture.fixture.homePoints} – {selectedFixture.fixture.awayPoints} {selectedFixture.fixture.away}
                </Text>
                <Text className="text-sm text-slate-400">
                  {selectedFixture.fixture.isBye
                    ? 'This manager has a bye this gameweek.'
                    : selectedFixture.fixture.homePoints === selectedFixture.fixture.awayPoints
                      ? 'The matchup is tied.'
                      : `${selectedFixture.fixture.homePoints > selectedFixture.fixture.awayPoints ? selectedFixture.fixture.home : selectedFixture.fixture.away} leads this matchup.`}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
