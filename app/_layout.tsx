import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Redirect,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  usePathname,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, View, type AppStateStatus } from 'react-native';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/lib/auth';
import { queryClient } from '@/src/lib/query-client';
import { Screen } from '@/src/components/Screen';
import { MobileThemeProvider, useMobileTheme } from '@/src/lib/theme';
import { MobilePushNotificationsProvider } from '@/src/lib/push-notifications';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  useEffect(() => {
    const handleAppStateChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <MobileThemeProvider>
          <ThemedApp />
        </MobileThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function ThemedApp() {
  const { theme } = useMobileTheme();
  return (
    <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <MobilePushNotificationsProvider>
        <AppRoutes />
      </MobilePushNotificationsProvider>
    </NavigationThemeProvider>
  );
}

function AppRoutes() {
  const { ready, session } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const isAuthRoute = segments[0] === '(auth)';
  const isPasswordRecovery = segments[0] === 'forgot-password';

  if (!ready && !isAuthRoute && !isPasswordRecovery) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator accessibilityLabel="Restoring session" color="#fb923c" />
        </View>
      </Screen>
    );
  }
  if (ready && !session && !isAuthRoute && !isPasswordRecovery) {
    return (
      <Redirect
        href={{
          pathname: '/(auth)/sign-in',
          params: { returnTo: pathname },
        }}
      />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
