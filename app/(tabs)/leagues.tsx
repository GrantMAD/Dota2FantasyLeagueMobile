import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { createLeague, getLeagues, joinLeague, type CreateLeagueInput } from '@/src/features/leagues/api';
import { useAuth } from '@/src/lib/auth';

type FormMode = 'create' | 'join' | null;

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-10 flex-1 items-center justify-center rounded-xl border px-3 ${
        selected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
      }`}
      onPress={onPress}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-brand-300' : 'text-slate-300'}`}>{label}</Text>
    </Pressable>
  );
}

export default function LeaguesScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<FormMode>(null);
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
    onSuccess: async () => {
      setFormMode(null);
      setName('');
      setDescription('');
      setFormError(null);
      await refreshLeagues();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Unable to create the league.'),
  });
  const joinMutation = useMutation({
    mutationFn: joinLeague,
    onSuccess: async () => {
      setFormMode(null);
      setInviteCode('');
      setFormError(null);
      await refreshLeagues();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : 'Unable to join the league.'),
  });

  const myLeagues = (query.data ?? [])
    .filter((league) => league.standings.some((standing) => standing.userId === session?.user.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const submitting = createMutation.isPending || joinMutation.isPending;

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
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#fb923c" />
        }
      >
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Competitive circuits</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Leagues</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Follow your classic standings and head-to-head fixtures, or create a league and invite your friends.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-500 px-4"
            onPress={() => openForm('create')}
          >
            <Text className="font-bold text-slate-950">Create league</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
            onPress={() => openForm('join')}
          >
            <Text className="font-semibold text-white">Join with code</Text>
          </Pressable>
        </View>

        {formMode ? (
          <View className="gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">{formMode === 'create' ? 'Create a league' : 'Join a league'}</Text>
              <Pressable accessibilityRole="button" onPress={() => setFormMode(null)}>
                <Text className="font-semibold text-slate-400">Cancel</Text>
              </Pressable>
            </View>
            {formMode === 'create' ? (
              <>
                <TextInput
                  accessibilityLabel="League name"
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
                  maxLength={80}
                  onChangeText={setName}
                  placeholder="League name"
                  placeholderTextColor="#94a3b8"
                  value={name}
                />
                <TextInput
                  accessibilityLabel="League description"
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
                  maxLength={280}
                  multiline
                  onChangeText={setDescription}
                  placeholder="Description (optional)"
                  placeholderTextColor="#94a3b8"
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
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white"
                  keyboardType="number-pad"
                  onChangeText={setMaxParticipants}
                  placeholder="Maximum participants (4–32)"
                  placeholderTextColor="#94a3b8"
                  value={maxParticipants}
                />
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4"
                  disabled={submitting}
                  onPress={submitCreate}
                >
                  <Text className="font-bold text-slate-950">{submitting ? 'Creating…' : 'Create league'}</Text>
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
                  className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-base text-white"
                  onChangeText={(value) => setInviteCode(value.toUpperCase())}
                  placeholder="ABC-1234"
                  placeholderTextColor="#94a3b8"
                  value={inviteCode}
                />
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4"
                  disabled={submitting}
                  onPress={submitJoin}
                >
                  <Text className="font-bold text-slate-950">{submitting ? 'Joining…' : 'Join league'}</Text>
                </Pressable>
              </>
            )}
            {formError ? <Text accessibilityRole="alert" className="text-sm text-red-300">{formError}</Text> : null}
          </View>
        ) : null}

        <View className="gap-1">
          <Text className="text-xl font-bold text-white">Your leagues</Text>
          <Text className="text-sm text-slate-400">{myLeagues.length} joined</Text>
        </View>

        {query.isPending ? (
          <View accessibilityLabel="Loading leagues" className="items-center py-10">
            <ActivityIndicator color="#fb923c" />
          </View>
        ) : query.isError ? (
          <View accessibilityRole="alert" className="gap-3 rounded-2xl border border-red-900 bg-red-950 p-5">
            <Text className="font-semibold text-red-200">Leagues unavailable</Text>
            <Text className="text-sm leading-5 text-red-100">
              {query.error instanceof Error ? query.error.message : 'Unable to load your leagues.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
              <Text className="font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : myLeagues.length ? (
          <View className="gap-3">
            {myLeagues.map((league) => {
              const ownStanding = league.standings.find((standing) => standing.userId === session?.user.id);
              return (
                <Link key={league.id} href={`/league/${league.id}`} asChild>
                  <Pressable
                    accessibilityRole="button"
                    className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="font-bold text-white">{league.name}</Text>
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
                  </Pressable>
                </Link>
              );
            })}
          </View>
        ) : (
          <View className="gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <Text className="text-center text-base font-semibold text-white">You have not joined a league yet</Text>
            <Text className="text-center text-sm leading-5 text-slate-400">
              Create a league or join one with an invite code to see its standings here.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
