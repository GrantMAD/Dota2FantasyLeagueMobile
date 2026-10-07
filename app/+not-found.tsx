import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-bold text-white">This screen does not exist.</Text>
        <Link href="/sign-in" className="mt-4 p-4">
          <Text className="font-semibold text-brand-400">Return to sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}
