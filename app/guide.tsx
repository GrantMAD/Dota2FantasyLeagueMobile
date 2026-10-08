import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const steps = [
  {
    title: 'Start with the rules',
    description: 'Learn the eight-player squad format, five starting roles, scoring, captaincy, chips, transfers, and deadlines before making your first move.',
    href: '/rules' as const,
    action: 'Read rules & scoring',
  },
  {
    title: 'Build your squad',
    description: 'Choose professional players within your season budget. Complete one player for each starting role, then set your lineup and captaincy.',
    href: '/team' as const,
    action: 'Open My Team',
  },
  {
    title: 'Compete with managers',
    description: 'Join or create a classic or head-to-head league, compare standings, and follow your place on the global leaderboard.',
    href: '/leagues' as const,
    action: 'Explore leagues',
  },
  {
    title: 'Review and improve',
    description: 'Use player form, upcoming fixtures, your gameweek results, and analytics to plan before the next deadline.',
    href: '/analytics' as const,
    action: 'Open analytics',
  },
];

export default function GuideScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-300">Guided walkthrough</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Manager Guide</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-400">
            A mobile-friendly tour through the key steps of Fantasy Dota 2.
          </Text>
        </View>

        <View className="flex-row gap-2">
          {steps.map((item, index) => (
            <Pressable
              key={item.title}
              accessibilityRole="tab"
              accessibilityLabel={`Step ${index + 1}: ${item.title}`}
              accessibilityState={{ selected: stepIndex === index }}
              className={`h-2 flex-1 rounded-full ${stepIndex === index ? 'bg-brand-500' : 'bg-slate-700'}`}
              onPress={() => setStepIndex(index)}
            />
          ))}
        </View>

        <View className="gap-4 rounded-2xl border border-brand-500/30 bg-slate-900 p-5">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brand-300">
            Step {stepIndex + 1} of {steps.length}
          </Text>
          <Text className="text-2xl font-bold text-white">{step.title}</Text>
          <Text className="text-sm leading-6 text-slate-300">{step.description}</Text>
          <Link href={step.href} asChild>
            <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4">
              <Text className="font-bold text-on-accent">{step.action} →</Text>
            </Pressable>
          </Link>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-700"
              disabled={stepIndex === 0}
              onPress={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              <Text className={stepIndex === 0 ? 'text-slate-600' : 'text-slate-200'}>Previous</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-700"
              disabled={stepIndex === steps.length - 1}
              onPress={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
            >
              <Text className={stepIndex === steps.length - 1 ? 'text-slate-600' : 'text-slate-200'}>Next step</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-lg font-bold text-white">Core destinations</Text>
          {[
            { label: 'Player discovery', href: '/discover' as const },
            { label: 'Gameweek schedule', href: '/gameweeks' as const },
            { label: 'Squad planner', href: '/squad-planner' as const },
            { label: 'Help and FAQ', href: '/help' as const },
          ].map((item) => (
            <Link key={item.label} href={item.href} asChild>
              <Pressable className="min-h-11 flex-row items-center justify-between border-t border-slate-800 pt-2">
                <Text className="font-medium text-slate-200">{item.label}</Text>
                <Text className="font-bold text-brand-300">›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
