import { Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const features = [
  ['Advanced Player Analytics', 'Role-adjusted form, consistency, volatility, and matchup context for eligible players.'],
  ['Points Projections', 'Expected gameweek output based on fixtures, recent form, role, and historical performance.'],
  ['Transfer Recommendations', 'Ranked candidates, differentials, value signals, and price momentum before the deadline.'],
  ['Squad Optimiser', 'Find a strong eight-player squad within budget and role requirements.'],
  ['Price Movement Alerts', 'Track players likely to rise or fall as ownership and transfer activity changes.'],
  ['AI Fantasy Assistant', 'Data-backed recommendations based on live fantasy context.'],
];

const capabilities = [
  ['Squad building and transfers', true],
  ['Classic and H2H leagues', true],
  ['Global leaderboard', true],
  ['Basic player statistics', true],
  ['Advanced analytics and projections', false],
  ['Transfer recommendations', false],
  ['Squad optimisation', false],
];

export default function PremiumScreen() {
  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-8 pt-5">
        <View className="gap-4 rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-amber-300">Advanced fantasy tools</Text>
          <Text className="text-3xl font-bold text-white">Turn information into an edge.</Text>
          <Text className="text-sm leading-6 text-slate-300">
            Premium is planned to bring deeper analytics, smarter projections, and sharper transfer intelligence to managers who want to plan one move ahead.
          </Text>
          <Text className="text-xs leading-5 text-slate-500">Premium tools are coming soon. Core fantasy gameplay remains free.</Text>
          <Link href="/analytics" asChild>
            <Pressable className="min-h-11 self-start justify-center rounded-lg bg-brand-500 px-4">
              <Text className="font-bold text-on-accent">Use free analytics →</Text>
            </Pressable>
          </Link>
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
            <Text className="w-16 text-center text-xs font-semibold text-amber-300">Premium</Text>
          </View>
          {capabilities.map(([label, free]) => (
            <View key={String(label)} className="flex-row items-center border-b border-slate-800 py-2">
              <Text className="flex-1 text-sm text-slate-300">{String(label)}</Text>
              <Text className="w-12 text-center text-emerald-300">{free ? '✓' : '—'}</Text>
              <Text className="w-16 text-center text-amber-300">✓</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
