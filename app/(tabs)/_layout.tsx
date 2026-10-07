import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useAuth } from '@/src/lib/auth';
import { useMobileTheme } from '@/src/lib/theme';

export default function TabLayout() {
  const { ready, session } = useAuth();
  const { colors } = useMobileTheme();

  if (!ready) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel="Restoring session" className="flex-1" color="#fb923c" />
      </Screen>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.tabBarBackground, borderTopColor: colors.tabBarBorder },
        tabBarInactiveTintColor: colors.tabBarInactive,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'My Team',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' }} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: 'Leagues',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} tintColor={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
