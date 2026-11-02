import { Link, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { useAuth } from '@/src/lib/auth';

export default function NotFoundScreen() {
  const { session } = useAuth();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-xs font-bold uppercase tracking-widest text-brand-300">404 · Not found</Text>
        <Text className="text-center text-2xl font-bold text-white">This screen is unavailable</Text>
        <Text className="mb-3 text-center text-sm leading-5 text-slate-400">
          The link may be incorrect or this page may have moved. Choose a destination to continue.
        </Text>
        <Link href="/(tabs)" asChild>
          <Pressable accessibilityRole="button" className="min-h-12 w-full items-center justify-center rounded-xl bg-brand-500 px-4">
            <Text className="font-bold text-slate-950">Go to Home</Text>
          </Pressable>
        </Link>
        {session ? (
          <>
            <Link href="/(tabs)/discover" asChild>
              <Pressable accessibilityRole="button" className="min-h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4">
                <Text className="font-semibold text-white">Explore Discover</Text>
              </Pressable>
            </Link>
            <Link href="/(tabs)/more" className="p-3">
              <Text className="font-semibold text-brand-300">Open More</Text>
            </Link>
          </>
        ) : (
          <Link href="/(auth)/sign-in" className="p-3">
            <Text className="font-semibold text-brand-300">Go to sign in</Text>
          </Link>
        )}
      </View>
    </Screen>
  );
}
