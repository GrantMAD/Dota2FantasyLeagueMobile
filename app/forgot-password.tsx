import { useState } from 'react';
import * as Linking from 'expo-linking';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { getApiBaseUrl } from '@/src/lib/api';

export default function ForgotPasswordScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  async function openWebRecovery() {
    setErrorMessage(null);
    setOpening(true);
    try {
      const recoveryUrl = new URL('/forgot-password', getApiBaseUrl()).toString();
      await Linking.openURL(recoveryUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to open password recovery.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-white">Reset password</Text>
          <Text className="mt-2 text-base leading-6 text-slate-400">
            Continue to the Fantasy Dota 2 website to request a reset email and choose a new password.
            This uses the existing web recovery flow.
          </Text>
        </View>
        {errorMessage ? (
          <Text accessibilityRole="alert" className="mb-4 text-sm text-red-300">{errorMessage}</Text>
        ) : null}
        <Button
          label="Continue to password recovery"
          loading={opening}
          onPress={() => void openWebRecovery()}
        />
        <Text className="mt-4 text-center text-xs leading-5 text-slate-500">
          After changing your password in the browser, return here and sign in with it.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
