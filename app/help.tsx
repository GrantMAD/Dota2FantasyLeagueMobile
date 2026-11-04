import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { LearningResourcesNav } from '@/src/components/LearningResourcesNav';

const faqs = [
  {
    question: 'How do I join a league?',
    answer: 'Open Leagues to browse public leagues or join a private league by entering the invite code provided by its creator.',
  },
  {
    question: 'Why didn’t my player score any points?',
    answer: 'Players only score points for eligible matches within a gameweek. Make sure the player actually played an official match. If they were benched in real life, your bench substitute can automatically replace them if they match the role requirements and played during the gameweek.',
  },
  {
    question: 'What happens if there is a tie in head-to-head?',
    answer: 'If both participants score the exact same amount of fantasy points, the match ends in a draw and both participants receive 1 league point.',
  },
  {
    question: 'Can a player have multiple roles?',
    answer: 'Some players may be eligible for multiple roles, such as Mid and Carry. You can play them in any of their eligible positions according to their profile.',
  },
  {
    question: 'When are points calculated?',
    answer: 'Fantasy points are calculated shortly after a professional match concludes. League standings and global rankings are updated when the gameweek is fully closed and locked.',
  },
  {
    question: 'How does the auto-bench substitution choose a replacement?',
    answer: 'Substitutions check Bench 1, then Bench 2, then Bench 3. The substitute must match the exact position of the absent starter and must have played at least one match in that gameweek. Each bench player can replace only one absent starter.',
  },
];

export default function HelpScreen() {
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(() => new Set());

  function toggleQuestion(index: number) {
    setOpenQuestions((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-300">Support & FAQ Center</Text>
          <Text className="text-3xl font-bold text-slate-50">Help Center & Knowledge Base</Text>
          <Text className="text-sm leading-6 text-slate-400">
            Find answers, onboarding walkthroughs, rule clarifications, and platform assistance.
          </Text>
          <Link href="/guide" asChild>
            <Pressable accessibilityRole="button" className="mt-2 min-h-11 flex-row items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4">
              <Text className="text-cyan-300">✦</Text>
              <Text className="font-semibold text-slate-200">Interactive Guide</Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between border-b border-slate-700 pb-2">
            <Text className="text-xl font-bold text-slate-50">Frequently Asked Questions</Text>
            <Text className="text-xs font-semibold text-slate-500">{faqs.length} questions</Text>
          </View>
          {faqs.map((faq, index) => {
            const isOpen = openQuestions.has(index);
            return (
              <View key={faq.question} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  className="min-h-14 flex-row items-center justify-between gap-3 px-4 py-3"
                  onPress={() => toggleQuestion(index)}
                >
                  <Text className="flex-1 font-semibold text-slate-50">{faq.question}</Text>
                  <Text className="text-lg font-bold text-brand-300">{isOpen ? '−' : '+'}</Text>
                </Pressable>
                {isOpen ? (
                  <Text className="border-t border-slate-700 bg-slate-800/50 px-4 py-4 text-sm leading-6 text-slate-300">{faq.answer}</Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10"><Text>🛡️</Text></View>
            <Text className="text-lg font-bold text-slate-50">Role eligibility</Text>
          </View>
          <Text className="text-sm leading-6 text-slate-300">
            Your starting lineup needs one Carry, Mid, Offlane, Support, and Hard Support. Bench places are optional, and a player can only be assigned to an eligible role.
          </Text>
          <Link href={{ pathname: '/rules', params: { section: 'squad' } }} asChild>
            <Pressable className="min-h-11 justify-center">
              <Text className="font-semibold text-brand-300">View role rules →</Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10"><Text>📘</Text></View>
            <Text className="text-lg font-bold text-slate-50">Onboarding Guide</Text>
          </View>
          <Text className="text-sm leading-5 text-slate-400">
            New to Fantasy Dota 2? Learn to draft your first squad, navigate the transfer market, and understand player pricing.
          </Text>
          <Link href="/learn" asChild>
            <Pressable className="min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4">
              <Text className="font-bold text-amber-950">Open Learn Hub →</Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10"><Text>🐞</Text></View>
            <Text className="text-lg font-bold text-slate-50">Found a problem?</Text>
          </View>
          <Text className="text-sm leading-5 text-slate-400">
            Report a bug, error, or interface issue and follow updates from the support team.
          </Text>
          <Link href={{ pathname: '/report-issue', params: { pageUrl: '/help' } }} asChild>
            <Pressable accessibilityRole="button" className="min-h-11 justify-center">
              <Text className="font-semibold text-brand-300">Report an issue →</Text>
            </Pressable>
          </Link>
        </View>
        <LearningResourcesNav currentPage="help" />
      </ScrollView>
    </Screen>
  );
}
