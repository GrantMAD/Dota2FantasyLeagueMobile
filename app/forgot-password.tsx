import { useState } from 'react';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { AuthCard } from '@/src/components/auth/AuthCard';
import { AuthInput } from '@/src/components/auth/AuthInput';
import { Button } from '@/src/components/Button';
import { requestManagerPasswordReset } from '@/src/features/account/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function sendResetLink() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await requestManagerPasswordReset(email, Linking.createURL('reset-password'));
      setEmailSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send a password reset link.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-5 py-8"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AuthCard>
          <View className="gap-5 p-5">
            {emailSent ? (
              <View accessibilityLiveRegion="polite" className="gap-4">
                <View className="gap-2">
                  <Text className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    Recovery email requested
                  </Text>
                  <Text className="text-2xl font-black text-white">Check your inbox</Text>
                  <Text className="text-sm leading-6 text-slate-300">
                    If an account is registered with {email.trim()}, Supabase will send a secure reset link. Open it on this device to choose a new password.
                  </Text>
                </View>
                <View className="gap-2 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <Text className="text-sm text-slate-300">1. Open the reset email on this device.</Text>
                  <Text className="text-sm text-slate-300">2. Follow the link to set a new password.</Text>
                  <Text className="text-sm text-slate-300">3. Continue in the app when the password is updated.</Text>
                </View>
                <Text className="text-xs leading-5 text-slate-400">
                  Check your spam folder if the email does not arrive. Reset links expire; you can request a fresh one below.
                </Text>
                <Button label="Send another reset link" onPress={() => setEmailSent(false)} />
              </View>
            ) : (
              <>
                <View className="gap-2">
                  <Text className="text-xs font-bold uppercase tracking-widest text-amber-300">Account recovery</Text>
                  <Text className="text-2xl font-black text-white">Reset your password</Text>
                  <Text className="text-sm leading-6 text-slate-400">
                    Enter your account email and we will send a secure reset link directly through Supabase.
                  </Text>
                </View>
                {errorMessage ? (
                  <Text accessibilityRole="alert" className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">
                    {errorMessage}
                  </Text>
                ) : null}
                <AuthInput
                  label="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  returnKeyType="done"
                  textContentType="emailAddress"
                  value={email}
                  onSubmitEditing={() => void sendResetLink()}
                />
                <Button
                  disabled={!email.trim()}
                  label="Send reset link"
                  loading={isSubmitting}
                  onPress={() => void sendResetLink()}
                />
              </>
            )}
            <Link href="/sign-in" className="self-center py-2">
              <Text className="text-sm font-semibold text-brand-300">Back to sign in</Text>
            </Link>
          </View>
        </AuthCard>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
