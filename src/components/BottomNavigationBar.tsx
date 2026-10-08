import type { ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileTheme } from '@/src/lib/theme';

const destinations: {
  label: string;
  href: Href;
  icon: ComponentProps<typeof SymbolView>['name'];
  matches: (pathname: string) => boolean;
}[] = [
  {
    label: 'Home',
    href: '/',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
    matches: (pathname) => pathname === '/' || pathname.startsWith('/gameweek') || pathname === '/squad-planner',
  },
  {
    label: 'My Team',
    href: '/team',
    icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' },
    matches: (pathname) => pathname.startsWith('/team'),
  },
  {
    label: 'Discover',
    href: '/discover',
    icon: { ios: 'magnifyingglass', android: 'search', web: 'search' },
    matches: (pathname) =>
      pathname === '/discover' ||
      pathname.startsWith('/player/') ||
      pathname.startsWith('/match/') ||
      pathname.startsWith('/tournament/') ||
      pathname === '/matches' ||
      pathname === '/tournaments' ||
      pathname === '/compare-players',
  },
  {
    label: 'Leagues',
    href: '/leagues',
    icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
    matches: (pathname) => pathname === '/leagues' || pathname.startsWith('/league/') || pathname === '/leaderboard',
  },
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useMobileTheme();
  const selected = destinations.find((destination) => destination.matches(pathname));

  return (
    <SafeAreaView
      className="border-t border-slate-800 bg-slate-950"
      edges={['bottom', 'left', 'right']}
    >
      <View className="h-14 flex-row items-center justify-around">
        {destinations.map((destination) => {
          const isSelected = selected?.label === destination.label;
          const color = isSelected ? colors.tabBarActive : colors.tabBarInactive;
          return (
            <Pressable
              key={destination.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              className="h-full flex-1 items-center justify-center gap-1"
              onPress={() => router.replace(destination.href)}
            >
              <SymbolView name={destination.icon} tintColor={color} size={21} />
              <Text style={{ color, fontSize: 12 }}>{destination.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
