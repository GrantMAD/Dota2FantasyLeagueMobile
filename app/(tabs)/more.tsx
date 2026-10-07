import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { useAuth } from '@/src/lib/auth';

export default function MoreScreen() {
  const { signOut } = useAuth();
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
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-6 py-8">
        <Text className="text-2xl font-bold text-white">More</Text>
        <Text className="mt-2 text-slate-400">Open planning tools, notifications, learning resources, and account settings.</Text>
        <Link href="/gameweeks" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Gameweeks</Text>
            <Text className="mt-1 text-sm text-slate-400">Schedule, deadlines, and recent scores</Text>
          </Pressable>
        </Link>
        <Link href="/squad-planner" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Squad Planner</Text>
            <Text className="mt-1 text-sm text-slate-400">Player availability and fixtures</Text>
          </Pressable>
        </Link>
        <Link href="/leaderboard" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Global Leaderboard</Text>
            <Text className="mt-1 text-sm text-slate-400">Overall and gameweek rankings</Text>
          </Pressable>
        </Link>
        <Link href="/analytics" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Analytics</Text>
            <Text className="mt-1 text-sm text-slate-400">Score trends, captaincy, and player value</Text>
          </Pressable>
        </Link>
        <Link href="/season-recap" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Season Recap</Text>
            <Text className="mt-1 text-sm text-slate-400">Review completed seasons and optionally share</Text>
          </Pressable>
        </Link>
        <Link href="/notifications" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Notifications</Text>
            <Text className="mt-1 text-sm text-slate-400">Deadlines, scoring, market, and league updates</Text>
          </Pressable>
        </Link>
        <Link href="/learn" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Learn & Rules</Text>
            <Text className="mt-1 text-sm text-slate-400">Fantasy scoring, chips, transfers, and deadlines</Text>
          </Pressable>
        </Link>
        <Link href="/profile" asChild>
          <Pressable
            accessibilityRole="button"
            className="min-h-16 justify-center rounded-xl border border-slate-700 bg-slate-900 px-4"
          >
            <Text className="font-semibold text-white">Profile & Settings</Text>
            <Text className="mt-1 text-sm text-slate-400">Manager details and notification preferences</Text>
          </Pressable>
        </Link>
        {errorMessage ? <Text accessibilityRole="alert" className="mt-5 text-sm text-red-300">{errorMessage}</Text> : null}
        <View className="mt-5">
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
