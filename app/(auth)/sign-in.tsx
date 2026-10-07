import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { useAuth } from '@/src/lib/auth';
import { managerReturnRoute } from '@/src/lib/deep-links';

export default function SignInScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const { configurationError, ready, session, signIn } = useAuth();
  const returnRoute = managerReturnRoute(params.returnTo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (ready && session) return <Redirect href={returnRoute} />;

  async function handleSignIn() {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="mb-8">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
            <Text className="text-lg font-black text-white">D2</Text>
          </View>
          <Text className="text-3xl font-bold text-white">Fantasy Dota 2</Text>
          <Text className="mt-2 text-base text-slate-400">Sign in to manage your fantasy team.</Text>
        </View>

        {!ready ? (
          <ActivityIndicator accessibilityLabel="Restoring session" color="#fb923c" />
        ) : configurationError ? (
          <View accessibilityRole="alert" className="rounded-xl border border-amber-700 bg-amber-950 p-4">
            <Text className="font-semibold text-amber-200">Setup required</Text>
            <Text className="mt-2 text-sm text-amber-100">{configurationError}</Text>
          </View>
        ) : (
          <View className="gap-4">
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="current-password"
              label="Password"
              onChangeText={setPassword}
              onSubmitEditing={() => void handleSignIn()}
              placeholder="Enter your password"
              returnKeyType="done"
              secureTextEntry
              textContentType="password"
              value={password}
            />

            {errorMessage ? (
              <Text accessibilityRole="alert" className="text-sm text-red-300">{errorMessage}</Text>
            ) : null}

            <Button
              disabled={submitting || !email.trim() || !password}
              label="Sign in"
              loading={submitting}
              onPress={() => void handleSignIn()}
            />
            <Link href="/forgot-password" className="text-center text-sm font-semibold text-brand-300">
              Forgot password?
            </Link>
            <Link href="/(auth)/sign-up" className="text-center text-sm font-semibold text-slate-300">
              Create an account
            </Link>
            <Text className="text-center text-xs leading-5 text-slate-500">
              Use the same account as the Fantasy Dota 2 web app.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
