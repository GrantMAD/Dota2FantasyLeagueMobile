import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const shortcuts = [
  { href: '/rules' as const, title: 'Rules & scoring', description: 'Squad structure, points, chips, transfers, and deadlines.' },
  { href: '/gameweeks' as const, title: 'Gameweeks', description: 'Review upcoming deadlines, fixtures, and scores.' },
  { href: '/squad-planner' as const, title: 'Squad planner', description: 'Check player availability and upcoming team fixtures.' },
  { href: '/leaderboard' as const, title: 'Global rankings', description: 'Compare overall and gameweek standings.' },
];

export default function LearnScreen() {
  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-400">Manager guide</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Learn the game</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-400">
            Get familiar with fantasy scoring and use the mobile tools to plan your next move.
          </Text>
        </View>
        {shortcuts.map((shortcut) => (
          <Link key={shortcut.href} href={shortcut.href} asChild>
            <Pressable
              accessibilityRole="button"
              className="min-h-20 justify-center gap-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <Text className="font-bold text-white">{shortcut.title}</Text>
              <Text className="text-sm leading-5 text-slate-400">{shortcut.description}</Text>
            </Pressable>
          </Link>
        ))}
        <View className="rounded-2xl border border-cyan-900/60 bg-cyan-950/30 p-4">
          <Text className="font-semibold text-cyan-200">Server-enforced rules</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-300">
            Squad ownership, lineup eligibility, transfer budget, chip eligibility, scores, and deadlines are checked by
            the shared web backend. The server response is authoritative.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
