import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const faqs = [
  {
    question: 'How do I join a league?',
    answer: 'Open Leagues to browse public leagues or join a private league using the invite code provided by its creator.',
  },
  {
    question: 'Why did my player not score any points?',
    answer: 'Players score for eligible matches within a gameweek. If a professional player did not participate, an eligible same-role bench substitute may replace the absent starter according to the published rules.',
  },
  {
    question: 'What happens when a head-to-head league match is tied?',
    answer: 'When both managers score the same number of fantasy points, the match is a draw and each manager receives one league point.',
  },
  {
    question: 'Can a player have multiple roles?',
    answer: 'Some players are eligible for more than one role. Their available roles are shown in team management and player discovery; only a role that is eligible for the player can be assigned.',
  },
  {
    question: 'When are points calculated?',
    answer: 'Fantasy points are calculated after professional matches conclude. League standings and global rankings are updated when gameweek scoring is processed and may lag behind match results.',
  },
];

export default function HelpScreen() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-300">Support</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Help Center & FAQ</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-400">Find answers to common questions about leagues, scoring, and player eligibility.</Text>
        </View>

        <View className="gap-3">
          <Text className="text-xl font-bold text-white">Frequently Asked Questions</Text>
          {faqs.map((faq, index) => {
            const isOpen = openQuestion === index;
            return (
              <View key={faq.question} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  className="min-h-14 flex-row items-center justify-between gap-3 px-4 py-3"
                  onPress={() => setOpenQuestion(isOpen ? null : index)}
                >
                  <Text className="flex-1 font-semibold text-white">{faq.question}</Text>
                  <Text className="text-lg font-bold text-brand-300">{isOpen ? '−' : '+'}</Text>
                </Pressable>
                {isOpen ? (
                  <Text className="border-t border-slate-700 px-4 py-4 text-sm leading-6 text-slate-300">{faq.answer}</Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-lg font-bold text-white">Role eligibility</Text>
          <Text className="text-sm leading-6 text-slate-300">
            Your starting lineup needs one Carry, Mid, Offlane, Support, and Hard Support. Bench places are optional, and a player can only be assigned to an eligible role.
          </Text>
          <Link href="/rules" asChild>
            <Pressable className="min-h-11 justify-center">
              <Text className="font-semibold text-brand-300">Read the full rules & scoring →</Text>
            </Pressable>
          </Link>
        </View>

        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-lg font-bold text-white">New to Fantasy Dota 2?</Text>
          <Text className="text-sm leading-5 text-slate-400">Follow the mobile manager guide to build a squad, compete in leagues, and review your season.</Text>
          <Link href="/guide" asChild>
            <Pressable className="min-h-11 justify-center">
              <Text className="font-semibold text-brand-300">Open Manager Guide →</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}
