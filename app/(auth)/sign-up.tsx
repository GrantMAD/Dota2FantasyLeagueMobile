import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { TextField } from '@/src/components/TextField';
import { createManagerAccount } from '@/src/features/account/api';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignUp() {
    setErrorMessage(null);
    if (password.length < 8) {
      setErrorMessage('Your password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createManagerAccount({ email, username, password });
      setConfirmationMessage(result.message);
      setCreated(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.');
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
        {created ? (
          <View className="gap-4">
            <Text className="text-3xl font-bold text-white">Check your email</Text>
            <Text className="text-base leading-6 text-slate-400">
              {confirmationMessage}
            </Text>
            <Button label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} />
          </View>
        ) : (
          <>
            <View className="mb-8">
              <Text className="text-3xl font-bold text-white">Create your account</Text>
              <Text className="mt-2 text-base leading-6 text-slate-400">
                Use the same manager account across the mobile and web apps.
              </Text>
            </View>
            <View className="gap-4">
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                textContentType="emailAddress"
                value={email}
              />
              <TextField
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                label="Username"
                onChangeText={setUsername}
                placeholder="Choose a manager username"
                textContentType="username"
                value={username}
              />
              <TextField
                autoCapitalize="none"
                autoComplete="new-password"
                label="Password"
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                textContentType="newPassword"
                value={password}
              />
              {errorMessage ? (
                <Text accessibilityRole="alert" className="text-sm text-red-300">{errorMessage}</Text>
              ) : null}
              <Button
                disabled={submitting || !email.trim() || !username.trim() || !password}
                label="Create account"
                loading={submitting}
                onPress={() => void handleSignUp()}
              />
            </View>
            <Link href="/(auth)/sign-in" className="mt-6 text-center text-sm font-semibold text-brand-300">
              Already have an account? Sign in
            </Link>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
