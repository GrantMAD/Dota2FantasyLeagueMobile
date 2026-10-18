import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

interface GettingStartedChecklistProps {
  hasSquad: boolean;
  ownedPlayerCount: number;
  hasCompleteLineup: boolean;
  hasLeague: boolean;
}

export function GettingStartedChecklist({
  hasSquad,
  ownedPlayerCount,
  hasCompleteLineup,
  hasLeague,
}: GettingStartedChecklistProps) {
  const steps = [
    { title: 'Create your fantasy squad', href: '/team' as const, complete: hasSquad, action: 'Create squad' },
    {
      title: 'Fill your 8-player squad',
      href: '/team' as const,
      complete: ownedPlayerCount >= 8,
      action: 'Choose players',
    },
    {
      title: 'Set five starters and a captain',
      href: '/team' as const,
      complete: hasCompleteLineup,
      action: 'Set lineup',
    },
    { title: 'Join a league', href: '/leagues' as const, complete: hasLeague, action: 'Find a league' },
  ];
  const completedCount = steps.filter((step) => step.complete).length;

  if (completedCount === steps.length) return null;

  return (
    <View
      accessibilityLabel="Getting started checklist"
      className="gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4"
    >
      <View className="gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-lg font-bold text-white">Build your fantasy season</Text>
          <Text className="text-xs font-semibold text-cyan-200">{completedCount} of 4</Text>
        </View>
        <Text className="text-sm leading-5 text-slate-300">A few steps to get your team ready to compete.</Text>
      </View>
      <View className="gap-2">
        {steps.map((step, index) => (
          <View
            key={step.title}
            className={`flex-row items-center gap-3 rounded-xl border p-3 ${
              step.complete ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-slate-700 bg-slate-950/40'
            }`}
          >
            <View
              accessibilityLabel={step.complete ? 'Complete' : `Step ${index + 1}`}
              className={`h-7 w-7 items-center justify-center rounded-full ${
                step.complete ? 'bg-emerald-500/20' : 'bg-slate-800'
              }`}
            >
              <Text className={`text-xs font-bold ${step.complete ? 'text-emerald-300' : 'text-slate-300'}`}>
                {step.complete ? '✓' : index + 1}
              </Text>
            </View>
            <Text className={`flex-1 text-sm font-medium ${step.complete ? 'text-emerald-100' : 'text-white'}`}>
              {step.title}
            </Text>
            {!step.complete ? (
              <Link href={step.href} asChild>
                <Pressable accessibilityRole="button" className="min-h-9 justify-center px-1">
                  <Text className="text-xs font-semibold text-cyan-200">{step.action}</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
