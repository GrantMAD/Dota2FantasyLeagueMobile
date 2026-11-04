import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { LearningResourcesNav } from '@/src/components/LearningResourcesNav';

type GuideCategory = 'Squad & Team Management' | 'Competition & Esports' | 'Intelligence & Management';
type Difficulty = 'Beginner' | 'Tactical' | 'Advanced';
type GuideTour = {
  name: string;
  description: string;
  category: GuideCategory;
  href: Href;
  icon: string;
  badge: string;
  steps: number;
  difficulty: Difficulty;
  time: string;
  guideSteps: string[];
};

const tours: GuideTour[] = [
  { name: 'Command Center', description: 'Review your squad value, bank balance, live points, rank, and gameweek alerts.', category: 'Squad & Team Management', href: '/', icon: '⌂', badge: 'Hub', steps: 3, difficulty: 'Beginner', time: '2 mins', guideSteps: ['Check your current points, squad value, and available budget.', 'Review the next gameweek deadline and any live alerts.', 'Use the shortcuts to open your team, leagues, or recent activity.'] },
  { name: 'Squad Overview', description: 'See your five starters, three bench places, player roles, and prices.', category: 'Squad & Team Management', href: '/team', icon: '👥', badge: 'Roster', steps: 4, difficulty: 'Beginner', time: '2 mins', guideSteps: ['Review the five required starting roles and the players assigned to each.', 'Check the bench order and confirm each substitute has an eligible role.', 'Compare squad cost with your remaining budget.', 'Open player details or adjust your roster before the deadline.'] },
  { name: 'Lineup & Captaincy', description: 'Set your starters, captain and vice-captain, bench, and seasonal chips.', category: 'Squad & Team Management', href: '/team', icon: '🎯', badge: 'Tactics', steps: 5, difficulty: 'Tactical', time: '3 mins', guideSteps: ['Select one eligible player for every starting role.', 'Set a different captain and vice-captain from your starters.', 'Order your bench with same-role replacements in mind.', 'Review chip availability and activate only before the deadline.', 'Save your lineup and confirm the locked gameweek is the one you intended.'] },
  { name: 'Transfer Market', description: 'Review player options, prices, squad budget, and transfer allowances.', category: 'Squad & Team Management', href: '/team', icon: '🔁', badge: 'Market', steps: 3, difficulty: 'Tactical', time: '2 mins', guideSteps: ['Open transfer management from your team and review your free-transfer allowance.', 'Compare incoming players by role, price, form, and availability.', 'Check the confirmed budget and any transfer-hit cost before completing moves.'] },
  { name: 'Players Directory', description: 'Browse professional players and compare roles, teams, availability, and stats.', category: 'Squad & Team Management', href: '/discover', icon: '🔎', badge: 'Scouting', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Search or filter the player list by role, team, or availability.', 'Compare player form, price, and fantasy scoring information.', 'Open a player profile to see more detailed performance context.'] },
  { name: 'Player Performance Profile', description: 'Explore a player’s fantasy points, performance history, and price context.', category: 'Squad & Team Management', href: '/discover', icon: '📊', badge: 'Telemetry', steps: 3, difficulty: 'Tactical', time: '2 mins', guideSteps: ['Choose a player from Discover to open their profile.', 'Review recent fantasy points and match-by-match performance.', 'Use role, price, and form context to decide whether the player fits your squad.'] },
  { name: 'Leagues & Communities', description: 'Create or join public and private leagues, including Head-to-head competitions.', category: 'Competition & Esports', href: '/leagues', icon: '🏆', badge: 'Social', steps: 3, difficulty: 'Beginner', time: '2 mins', guideSteps: ['Browse public leagues or choose create/join to start a community.', 'Use an invite code to join a private league.', 'Open a league to review standings, fixtures, and members.'] },
  { name: 'Global Leaderboard', description: 'Compare manager rankings, country positions, and rank movement.', category: 'Competition & Esports', href: '/leaderboard', icon: '🥇', badge: 'Rankings', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Choose the overall table or an available gameweek view.', 'Filter the rankings by country or global standings.', 'Open a manager profile to compare points, rank, and recent progress.'] },
  { name: 'Gameweeks & Deadlines', description: 'Check lineup lock times, active matches, and completed gameweek results.', category: 'Competition & Esports', href: '/gameweeks', icon: '⏱️', badge: 'Schedule', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Select a gameweek to see its schedule and status.', 'Check the displayed deadline before changing your lineup or transfers.', 'Open a completed week to review results and scoring.'] },
  { name: 'Live & Upcoming Matches', description: 'Follow professional match status, tournament details, and fantasy schedules.', category: 'Competition & Esports', href: '/matches', icon: '⚔️', badge: 'Esports', steps: 3, difficulty: 'Beginner', time: '2 mins', guideSteps: ['Browse live, upcoming, or completed professional matches.', 'Check tournament and match status for the fixture you are following.', 'Open a match to review its result and fantasy-relevant details.'] },
  { name: 'Match Details & Log', description: 'Review match outcomes and individual fantasy score contributions.', category: 'Competition & Esports', href: '/matches', icon: '📋', badge: 'Deep Dive', steps: 3, difficulty: 'Tactical', time: '2.5 mins', guideSteps: ['Open a match from the match list.', 'Review the result, player performances, and scoring breakdown.', 'Use the contribution details to understand how fantasy points were earned.'] },
  { name: 'Pro Tournaments Index', description: 'Browse eligible professional events and their schedules.', category: 'Competition & Esports', href: '/tournaments', icon: '🎮', badge: 'Circuits', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Browse the tournament list and use the available filters.', 'Open an event to review its status and schedule.', 'Use the match schedule to follow events that affect upcoming gameweeks.'] },
  { name: 'League Rules & Scoring', description: 'Understand squad rules, point values, chips, transfers, and deadlines.', category: 'Intelligence & Management', href: '/rules', icon: '📜', badge: 'Rulebook', steps: 3, difficulty: 'Advanced', time: '3 mins', guideSteps: ['Use the section shortcuts to jump to a rule topic.', 'Compare scoring values and special cases before setting your lineup.', 'Review transfer, chip, and deadline rules before making changes.'] },
  { name: 'Performance Analytics', description: 'Explore your performance, market value, captaincy, and Dream Team insights.', category: 'Intelligence & Management', href: '/analytics', icon: '📈', badge: 'Data', steps: 3, difficulty: 'Advanced', time: '2.5 mins', guideSteps: ['Choose a performance tab and gameweek range.', 'Compare your trajectory, captain returns, and role scoring.', 'Use market and Dream Team insights to guide your next decisions.'] },
  { name: 'Advanced Analytics', description: 'Review planned Premium projections, scouting, and squad optimisation tools.', category: 'Intelligence & Management', href: '/premium', icon: '👑', badge: 'Pro Tier', steps: 3, difficulty: 'Advanced', time: '3 mins', guideSteps: ['Review the planned Premium toolkit and feature descriptions.', 'Compare planned capabilities with the free tools available now.', 'Use free analytics and join the waitlist only if you want future launch updates.'] },
  { name: 'Manager Profile', description: 'Manage your identity and review your fantasy season history.', category: 'Intelligence & Management', href: '/profile', icon: '🪪', badge: 'Identity', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Review your manager profile and current fantasy season details.', 'Update your public profile information and appearance preferences.', 'Check achievements and season history to track your progress.'] },
  { name: 'Activity Feed & Alerts', description: 'Review deadline reminders, market changes, match results, and league updates.', category: 'Intelligence & Management', href: '/notifications', icon: '🔔', badge: 'Inbox', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Filter notifications by category or unread status.', 'Open a notification action to navigate to its related screen.', 'Mark alerts read or adjust notification preferences.'] },
  { name: 'Account & Appearance', description: 'Update account details, notification preferences, and light or dark appearance.', category: 'Intelligence & Management', href: '/profile', icon: '⚙️', badge: 'Preferences', steps: 3, difficulty: 'Beginner', time: '2 mins', guideSteps: ['Open the profile/settings area and find account preferences.', 'Choose light or dark mode and confirm the saved appearance.', 'Review notification controls and other account settings.'] },
  { name: 'Help Center & Support', description: 'Find answers, role guidance, scoring help, and ways to contact support.', category: 'Intelligence & Management', href: '/help', icon: '❔', badge: 'Support', steps: 3, difficulty: 'Beginner', time: '1.5 mins', guideSteps: ['Search the FAQ topics by opening the relevant answer.', 'Follow the role or scoring links for the full rulebook.', 'Open Report an issue to contact support and follow a report.'] },
];

const categories: (GuideCategory | 'All')[] = [
  'All',
  'Squad & Team Management',
  'Competition & Esports',
  'Intelligence & Management',
];

const difficultyStyles: Record<Difficulty, string> = {
  Beginner: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Tactical: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  Advanced: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

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
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All');
  const [expandedTour, setExpandedTour] = useState<string | null>(null);
  const step = steps[stepIndex];
  const filteredTours = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return tours.filter((tour) =>
      (category === 'All' || tour.category === category) &&
      (!query || `${tour.name} ${tour.description} ${tour.badge}`.toLocaleLowerCase().includes(query)),
    );
  }, [category, search]);

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View>
          <Text className="text-sm font-semibold uppercase tracking-[3px] text-brand-300">Guided walkthrough</Text>
          <Text className="mt-2 text-3xl font-bold text-slate-50">Manager Guide</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-400">
            Start with the quick tour, then explore feature guides for squad management, competition, and account insights.
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
          <Text className="text-2xl font-bold text-slate-50">{step.title}</Text>
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

        <View className="gap-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">Feature walkthroughs</Text>
            <Text className="mt-1 text-xl font-bold text-slate-50">Explore by destination</Text>
          </View>
          <TextInput
            accessibilityLabel="Search walkthroughs"
            value={search}
            onChangeText={setSearch}
            placeholder="Search guides, tools, or topics"
            placeholderTextColor="#64748b"
            className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-slate-50"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {categories.map((item) => {
              const selected = category === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setCategory(item)}
                  className={`min-h-10 justify-center rounded-full border px-4 ${
                    selected ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${selected ? 'text-brand-300' : 'text-slate-300'}`}>{item}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text className="text-xs text-slate-500">{filteredTours.length} walkthroughs</Text>
          {filteredTours.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-slate-700 p-6">
              <Text className="text-center text-sm text-slate-400">No guides match that search. Try another term or category.</Text>
            </View>
          ) : filteredTours.map((tour) => {
            const isExpanded = expandedTour === tour.name;
            return (
              <View key={tour.name} className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
                    <Text accessibilityElementsHidden className="text-lg">{tour.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="flex-1 font-bold text-slate-50">{tour.name}</Text>
                      <Text className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">{tour.badge}</Text>
                    </View>
                    <Text className="mt-1 text-xs leading-5 text-slate-400">{tour.description}</Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                  <Text className="text-[10px] text-slate-400">{tour.category}</Text>
                  <Text className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${difficultyStyles[tour.difficulty]}`}>{tour.difficulty}</Text>
                  <Text className="text-xs text-slate-500">{tour.steps} steps</Text>
                  <Text className="text-xs text-slate-500">· {tour.time}</Text>
                </View>
                {isExpanded ? (
                  <View className="gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                    <Text className="text-xs font-bold uppercase tracking-wider text-brand-300">
                      {tour.name} · Step-by-step guide
                    </Text>
                    {tour.guideSteps.map((instruction, index) => (
                      <View key={instruction} className="flex-row items-start gap-2">
                        <Text className="font-bold text-brand-300">{index + 1}.</Text>
                        <Text className="flex-1 text-xs leading-5 text-slate-300">{instruction}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => setExpandedTour(isExpanded ? null : tour.name)}
                    className="min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-700 px-3"
                  >
                    <Text className="text-xs font-semibold text-slate-200">{isExpanded ? 'Close guide' : 'Start guide'}</Text>
                  </Pressable>
                  <Link href={tour.href} asChild>
                    <Pressable accessibilityRole="button" className="min-h-10 flex-1 items-center justify-center rounded-lg bg-brand-500 px-3">
                      <Text className="text-xs font-bold text-on-accent">Open destination →</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            );
          })}
        </View>

        <LearningResourcesNav currentPage="guide" />
      </ScrollView>
    </Screen>
  );
}
