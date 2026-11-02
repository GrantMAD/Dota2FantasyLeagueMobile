import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

type MoreIconName = ComponentProps<typeof SymbolView>['name'];

const MORE_SECTIONS: {
  title: string;
  icon: MoreIconName;
  tone: string;
  items: {
    label: string;
    description: string;
    href: Href;
    icon: MoreIconName;
    featured?: boolean;
  }[];
}[] = [
  {
    title: 'Planning',
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    tone: '#38bdf8',
    items: [
      {
        label: 'Gameweeks',
        description: 'Schedule, deadlines, and recent scores',
        href: '/gameweeks',
        icon: { ios: 'calendar.badge.clock', android: 'event', web: 'event' },
      },
      {
        label: 'Squad Planner',
        description: 'Plan selections around player availability and fixtures',
        href: '/squad-planner',
        icon: { ios: 'person.3.sequence.fill', android: 'groups_3', web: 'groups_3' },
        featured: true,
      },
    ],
  },
  {
    title: 'Community',
    icon: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
    tone: '#a78bfa',
    items: [
      {
        label: 'Friends',
        description: 'Follow managers and view their fantasy activity',
        href: '/friends',
        icon: { ios: 'person.2', android: 'group', web: 'group' },
      },
      {
        label: 'Global Leaderboard',
        description: 'Explore overall and gameweek rankings',
        href: '/leaderboard',
        icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
      },
    ],
  },
  {
    title: 'Competition & Esports',
    icon: { ios: 'gamecontroller.fill', android: 'sports_esports', web: 'sports_esports' },
    tone: '#fb923c',
    items: [
      {
        label: 'Matches',
        description: 'Browse professional match results',
        href: '/matches',
        icon: { ios: 'sportscourt.fill', android: 'sports', web: 'sports' },
      },
      {
        label: 'Tournaments',
        description: 'Explore tournament schedules and results',
        href: '/tournaments',
        icon: { ios: 'medal.fill', android: 'military_tech', web: 'military_tech' },
      },
    ],
  },
  {
    title: 'Insights',
    icon: { ios: 'chart.xyaxis.line', android: 'query_stats', web: 'query_stats' },
    tone: '#34d399',
    items: [
      {
        label: 'Analytics',
        description: 'Review score trends, captaincy, and player value',
        href: '/analytics',
        icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
        featured: true,
      },
      {
        label: 'Season Recap',
        description: 'Review completed seasons and optionally share',
        href: '/season-recap',
        icon: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
      },
      {
        label: 'Notifications',
        description: 'See deadline, scoring, market, and league updates',
        href: '/notifications',
        icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
      },
    ],
  },
  {
    title: 'Learning & Support',
    icon: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' },
    tone: '#fbbf24',
    items: [
      {
        label: 'Learn & Rules',
        description: 'Guides to scoring, chips, transfers, and deadlines',
        href: '/learn',
        icon: { ios: 'book.fill', android: 'auto_stories', web: 'auto_stories' },
      },
      {
        label: 'Help',
        description: 'Frequently asked questions and support options',
        href: '/help',
        icon: { ios: 'questionmark.circle.fill', android: 'help', web: 'help' },
      },
      {
        label: 'Report an issue',
        description: 'Report a bug, error, or interface problem',
        href: { pathname: '/report-issue', params: { pageUrl: '/more' } },
        icon: { ios: 'exclamationmark.bubble.fill', android: 'feedback', web: 'feedback' },
      },
      {
        label: 'Premium',
        description: 'Explore available features and join the waitlist',
        href: '/premium',
        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
        featured: true,
      },
    ],
  },
  {
    title: 'Account',
    icon: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
    tone: '#2dd4bf',
    items: [
      {
        label: 'Profile & Settings',
        description: 'Manage your profile, preferences, and devices',
        href: '/profile',
        icon: { ios: 'person.crop.circle', android: 'manage_accounts', web: 'manage_accounts' },
        featured: true,
      },
    ],
  },
];

export default function MoreScreen() {
  const { signOut } = useAuth();
  const { theme } = useMobileTheme();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    setErrorMessage(null);
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 py-6">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-white">More</Text>
          <Text className="text-sm leading-5 text-slate-400">
            Planning tools, competition insights, learning resources, and account settings.
          </Text>
        </View>

        {MORE_SECTIONS.map((section) => (
          <View key={section.title} className="gap-2.5">
            <View className="flex-row items-center gap-2 px-1">
              <SymbolView name={section.icon} size={17} tintColor={section.tone} />
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {section.title}
              </Text>
            </View>
            <View className="gap-2">
              {section.items.map((item) => (
                <Link key={item.label} href={item.href} asChild>
                  <Pressable
                    accessibilityRole="button"
                    className={`min-h-[68px] flex-row items-center gap-3 rounded-xl border px-3.5 py-3 ${
                      item.featured
                        ? theme === 'dark'
                          ? 'border-slate-700 bg-slate-900'
                          : 'border-slate-300 bg-slate-100'
                        : theme === 'dark'
                          ? 'border-slate-800 bg-slate-900/60'
                          : 'border-slate-300 bg-white'
                    }`}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${section.tone}20` }}
                    >
                      <SymbolView name={item.icon} size={19} tintColor={section.tone} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {item.label}
                      </Text>
                      <Text className="mt-0.5 text-xs leading-4 text-slate-400">{item.description}</Text>
                    </View>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={15}
                      tintColor={theme === 'dark' ? '#64748b' : '#506070'}
                    />
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ))}

        {errorMessage ? (
          <Text accessibilityRole="alert" className="text-sm text-red-300">{errorMessage}</Text>
        ) : null}
        <View className="border-t border-slate-800 pt-4">
          <Button
            disabled={signingOut}
            label="Sign out"
            loading={signingOut}
            onPress={() => void handleSignOut()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
