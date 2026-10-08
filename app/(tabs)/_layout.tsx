import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useAuth } from '@/src/lib/auth';

export default function TabLayout() {
  const { ready, session } = useAuth();

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
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'My Team',
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: 'Leagues',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
