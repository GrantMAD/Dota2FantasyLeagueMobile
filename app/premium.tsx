import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPremiumWaitlistStatus, joinPremiumWaitlist, removePremiumWaitlistEntry } from '@/src/features/premium/api';
import { useAuth } from '@/src/lib/auth';

const features = [
  ['Floor, Ceiling & Volatility Index', '10th and 90th percentile outcome ranges and volatility ratings so you never get caught out by boom-or-bust trap picks.'],
  ['Weighted Points Projections', 'Dynamic projections factoring 3-gameweek form momentum, 5-week baselines, and position benchmarks.'],
  ['Differential Scout & Recommendations', 'Uncover low-ownership (<15%) hidden gems outperforming their price bracket to climb past your league rivals.'],
  ['Position Benchmark (+/- vs Role)', 'Accurately evaluate player value by measuring performance deltas against the average for their exact primary role.'],
  ['Squad & Lineup Optimiser', 'Intelligent starter and captain suggestion engine targeting highest expected gameweek points output.'],
  ['Price Movement & Deadline Alerts', 'Track players on the verge of price changes as ownership and transfer velocity peak before locks.'],
];

const capabilities = [
  ['Squad building and transfers', true],
  ['Classic and H2H leagues', true],
  ['Global leaderboard & standings', true],
  ['Basic match stats & box scores', true],
  ['Floor, ceiling & volatility range', false],
  ['Weighted Next GW projections', false],
  ['Differential scout & AI transfers', false],
  ['Role benchmark index (+/- vs position)', false],
  ['Squad & lineup optimiser', false],
];

export default function PremiumScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const waitlistQueryKey = ['premium-waitlist', userId] as const;
  const waitlistQuery = useQuery({
    queryKey: waitlistQueryKey,
    queryFn: getPremiumWaitlistStatus,
    enabled: userId !== null,
    staleTime: 0,
  });
  const saveMutation = useMutation({
    mutationFn: () => joinPremiumWaitlist(email),
    onSuccess: (status) => {
      queryClient.setQueryData(waitlistQueryKey, status);
      setEmail(status.email);
      setConsent(false);
      setEditingEmail(false);
      setFeedback('You are on the Premium waitlist. No email has been sent.');
    },
  });
  const removeMutation = useMutation({
    mutationFn: removePremiumWaitlistEntry,
    onSuccess: (status) => {
      queryClient.setQueryData(waitlistQueryKey, status);
      setConsent(false);
      setEditingEmail(false);
      setFeedback('Your waitlist entry has been removed.');
    },
  });
  const busy = saveMutation.isPending || removeMutation.isPending;

  function confirmRemoveWaitlistEntry() {
    Alert.alert(
      'Remove waitlist entry?',
      'This deletes your saved email and withdraws your consent for Premium launch updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove me', style: 'destructive', onPress: () => removeMutation.mutate() },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-8 pt-5">
        <View className="gap-4 rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-amber-300">Advanced fantasy tools</Text>
          <Text className="text-3xl font-bold text-white">Turn information into an edge.</Text>
          <Text className="text-sm leading-6 text-slate-300">
            Premium is planned to bring deeper analytics, smarter projections, and sharper transfer intelligence to managers who want to plan one move ahead.
          </Text>
          <Text className="text-xs leading-5 text-slate-400">Premium tools are planned, with no launch date announced. Core fantasy gameplay remains free.</Text>
          <Link href="/analytics" asChild>
            <Pressable className="min-h-11 self-start justify-center rounded-lg bg-brand-500 px-4">
              <Text className="font-bold text-on-accent">Use free analytics →</Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Premium updates</Text>
            <Text className="text-xl font-bold text-white">Join the waitlist</Text>
            <Text className="text-sm leading-5 text-slate-300">
              Your email and consent are saved with your account for future Premium launch updates. Joining does not start a subscription, and no email is sent now.
            </Text>
          </View>
          {waitlistQuery.isPending ? (
            <View accessibilityLabel="Loading Premium waitlist status" className="items-start py-2">
              <ActivityIndicator color="#f59e0b" />
            </View>
          ) : waitlistQuery.isError ? (
            <View accessibilityRole="alert" className="gap-3">
              <Text className="text-sm leading-5 text-red-200">{waitlistQuery.error.message}</Text>
              <Pressable accessibilityRole="button" onPress={() => void waitlistQuery.refetch()}>
                <Text className="font-semibold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : waitlistQuery.data?.waitlisted && !editingEmail ? (
            <View className="gap-4">
              <View className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <Text className="font-semibold text-emerald-200">You are on the Premium waitlist</Text>
                <Text className="mt-1 text-sm text-slate-200">{waitlistQuery.data.email}</Text>
                <Text className="mt-2 text-xs leading-5 text-slate-400">We are not sending emails yet.</Text>
              </View>
              {removeMutation.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">{removeMutation.error.message}</Text> : null}
              {feedback ? <Text accessibilityRole="alert" className="text-sm text-brand-300">{feedback}</Text> : null}
              <View className="flex-row flex-wrap gap-3">
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    setEmail(waitlistQuery.data.email);
                    setFeedback(null);
                    setEditingEmail(true);
                  }}
                  className="min-h-11 justify-center rounded-lg border border-slate-600 px-4"
                >
                  <Text className="font-semibold text-slate-200">Change email</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={confirmRemoveWaitlistEntry}
                  className="min-h-11 justify-center rounded-lg border border-red-900 px-4"
                >
                  <Text className="font-semibold text-red-200">Remove me</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              <TextField
                label="Email address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                maxLength={254}
                editable={!busy}
                placeholder="you@example.com"
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                disabled={busy}
                onPress={() => setConsent((checked) => !checked)}
                className="min-h-12 flex-row items-start gap-3"
              >
                <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${consent ? 'border-amber-400 bg-amber-400' : 'border-slate-500'}`}>
                  {consent ? <Text className="text-xs font-black text-slate-950">✓</Text> : null}
                </View>
                <Text className="flex-1 text-sm leading-5 text-slate-300">
                  I agree to receive Premium launch updates at this address. I can remove my waitlist entry at any time.
                </Text>
              </Pressable>
              {saveMutation.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">{saveMutation.error.message}</Text> : null}
              {removeMutation.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">{removeMutation.error.message}</Text> : null}
              {feedback ? <Text accessibilityRole="alert" className="text-sm text-brand-300">{feedback}</Text> : null}
              <View className="flex-row justify-end gap-3">
                {waitlistQuery.data?.waitlisted ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      setEditingEmail(false);
                      setConsent(false);
                      saveMutation.reset();
                    }}
                    className="min-h-11 justify-center rounded-lg border border-slate-600 px-4"
                  >
                    <Text className="font-semibold text-slate-200">Cancel</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy || !consent }}
                  disabled={busy || !consent || email.trim().length === 0}
                  onPress={() => {
                    setFeedback(null);
                    saveMutation.mutate();
                  }}
                  className={`min-h-11 justify-center rounded-lg px-4 ${consent && !busy ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <Text className="font-bold text-slate-950">{busy ? 'Saving…' : waitlistQuery.data?.waitlisted ? 'Update email' : 'Join waitlist'}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View className="gap-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">The toolkit</Text>
            <Text className="mt-1 text-xl font-bold text-white">Make every decision count</Text>
          </View>
          {features.map(([title, description]) => (
            <View key={title} className="gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-bold text-white">{title}</Text>
                <Text className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Planned</Text>
              </View>
              <Text className="text-sm leading-5 text-slate-400">{description}</Text>
            </View>
          ))}
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">Access model</Text>
          <Text className="text-xl font-bold text-white">Free foundation, optional depth</Text>
          <View className="flex-row border-b border-slate-700 pb-2">
            <Text className="flex-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Capability</Text>
            <Text className="w-12 text-center text-xs font-semibold text-emerald-300">Free</Text>
            <Text className="w-20 text-center text-xs font-semibold text-amber-300">Planned Premium</Text>
          </View>
          {capabilities.map(([label, free]) => (
            <View key={String(label)} className="flex-row items-center border-b border-slate-800 py-2">
              <Text className="flex-1 text-sm text-slate-300">{String(label)}</Text>
              <Text className="w-12 text-center text-emerald-300">{free ? '✓' : '—'}</Text>
              <Text className="w-20 text-center text-amber-300">✓</Text>
            </View>
          ))}
        </View>

        <View className="gap-4">
          <View className="gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Available now</Text>
            <Text className="text-lg font-bold text-white">The core game stays free</Text>
            <Text className="text-sm leading-5 text-slate-300">
              Build your squad, make transfers, join leagues, follow the leaderboard, and use current analytics without a Premium subscription.
            </Text>
          </View>
          <View className="gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Planned</Text>
            <Text className="text-lg font-bold text-white">More ways to plan your season</Text>
            <Text className="text-sm leading-5 text-slate-300">
              Advanced analytics, projections, transfer recommendations, squad optimisation, price alerts, and the fantasy assistant are planned Premium tools. No launch date has been announced.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
