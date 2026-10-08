import { Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const quickRules = [
  { label: 'Squad size', value: '8 players' },
  { label: 'Starting roles', value: '5 positions' },
  { label: 'Starting budget', value: '$100.0M' },
  { label: 'Captain bonus', value: '2.0× points' },
  { label: 'Free transfers', value: '1 per gameweek' },
  { label: 'Lock window', value: '30 minutes' },
];

const actions = [
  { title: 'Build your squad', description: 'Draft an eight-player roster within the season budget.', href: '/team' as const, label: 'Open Squad' },
  { title: 'Set your lineup', description: 'Assign starters, captaincy, bench players, and chips.', href: '/team' as const, label: 'Set Lineup' },
  { title: 'Check the next deadline', description: 'Review the gameweek schedule and lock time.', href: '/gameweeks' as const, label: 'View Gameweeks' },
  { title: 'Explore the market', description: 'Compare player prices, form, availability, and value.', href: '/discover' as const, label: 'Scout Players' },
];

export default function LearnScreen() {
  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-8 pt-5">
        <View className="gap-4 rounded-2xl border border-brand-500/30 bg-slate-900 p-5">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[3px] text-brand-300">Fantasy learning center</Text>
            <Text className="mt-2 text-3xl font-bold text-white">Learn the game. Make better calls.</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-300">
              Start with a guided tour, check the official scoring rules, then move straight into managing your team.
            </Text>
          </View>
          <Link href="/guide" asChild>
            <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4">
              <Text className="font-bold text-on-accent">Start the manager guide →</Text>
            </Pressable>
          </Link>
          <View className="flex-row flex-wrap gap-2 border-t border-slate-800 pt-4">
            {['1  Start', '2  Build', '3  Compete', '4  Improve'].map((step) => (
              <Text key={step} className="rounded-full bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300">{step}</Text>
            ))}
          </View>
        </View>

        <View className="flex-row gap-3">
          <Link href="/guide" asChild>
            <Pressable className="min-h-28 flex-1 justify-center gap-2 rounded-2xl border border-brand-500/30 bg-slate-900 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-brand-300">Walkthroughs</Text>
              <Text className="text-lg font-bold text-white">Manager Guide</Text>
              <Text className="text-xs leading-4 text-slate-400">Step-by-step mobile tour</Text>
            </Pressable>
          </Link>
          <Link href="/rules" asChild>
            <Pressable className="min-h-28 flex-1 justify-center gap-2 rounded-2xl border border-amber-500/30 bg-slate-900 p-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-amber-300">Official reference</Text>
              <Text className="text-lg font-bold text-white">Rules & Scoring</Text>
              <Text className="text-xs leading-4 text-slate-400">Squad, points, chips, and deadlines</Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-3">
          <View className="flex-row items-end justify-between gap-3">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">At a glance</Text>
              <Text className="mt-1 text-xl font-bold text-white">Core fantasy rules</Text>
            </View>
            <Link href="/rules"><Text className="font-semibold text-brand-300">Full rules →</Text></Link>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {quickRules.map((rule) => (
              <Link key={rule.label} href="/rules" asChild>
                <Pressable className="min-h-20 min-w-[47%] flex-1 justify-center rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <Text className="text-xs text-slate-500">{rule.label}</Text>
                  <Text className="mt-1 font-semibold text-white">{rule.value}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">Learn by doing</Text>
            <Text className="mt-1 text-xl font-bold text-white">Your next move</Text>
          </View>
          {actions.map((action) => (
            <Link key={action.title} href={action.href} asChild>
              <Pressable className="min-h-20 flex-row items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Text className="font-bold text-emerald-300">→</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-white">{action.title}</Text>
                  <Text className="mt-1 text-xs leading-4 text-slate-400">{action.description}</Text>
                </View>
                <Text className="text-xs font-semibold text-brand-300">{action.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <View className="flex-row gap-3">
          <Link href="/help" asChild>
            <Pressable className="min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3">
              <Text className="font-semibold text-slate-200">Help Center</Text>
            </Pressable>
          </Link>
          <Link href="/premium" asChild>
            <Pressable className="min-h-11 flex-1 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-3">
              <Text className="font-semibold text-amber-300">Premium Tools</Text>
            </Pressable>
          </Link>
        </View>
        <View className="rounded-2xl border border-cyan-900/60 bg-cyan-950/30 p-4">
          <Text className="font-semibold text-cyan-200">Server-enforced rules</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-300">
            Squad ownership, lineup eligibility, transfer budget, chip eligibility, scores, and deadlines are checked by
            the shared backend. The server response is authoritative.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
