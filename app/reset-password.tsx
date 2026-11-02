import { useEffect, useRef, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { AuthCard } from '@/src/components/auth/AuthCard';
import { AuthInput } from '@/src/components/auth/AuthInput';
import { PasswordStrength } from '@/src/components/auth/PasswordStrength';
import { Button } from '@/src/components/Button';
import { exchangeMobileAuthCode, updateManagerPassword } from '@/src/features/account/api';

type RecoveryStatus = 'verifying' | 'ready' | 'error' | 'updated';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
  }>();
  const router = useRouter();
  const code = firstParam(params.code);
  const linkError = firstParam(params.error_description) || firstParam(params.error_code);
  const [verification, setVerification] = useState<{ code: string; error?: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const processedCode = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!linkError && code && processedCode.current !== code) {
      processedCode.current = code;
      void exchangeMobileAuthCode(code).then(() => {
        if (active) setVerification({ code });
      }).catch((error: unknown) => {
        if (!active) return;
        setVerification({
          code,
          error: error instanceof Error
            ? error.message
            : 'This password-reset link could not be verified. Request a new link and try again.',
        });
      });
    }
    return () => {
      active = false;
    };
  }, [code, linkError]);

  const verificationError = linkError
    ? 'This password-reset link is invalid or has expired. Request a new link to continue.'
    : !code
      ? 'The password-reset link is missing its verification code. Request a new link to continue.'
      : verification?.code === code
        ? verification.error ?? null
        : null;
  const status: RecoveryStatus = passwordUpdated
    ? 'updated'
    : verificationError
      ? 'error'
      : code && verification?.code === code
        ? 'ready'
        : 'verifying';

  async function savePassword() {
    setFormError(null);
    if (password.length < 8) {
      setFormError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateManagerPassword(password);
      setPasswordUpdated(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update your password.');
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
            {status === 'verifying' ? (
              <View accessibilityLiveRegion="polite" className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-widest text-amber-300">Secure account recovery</Text>
                <Text className="text-2xl font-black text-white">Verifying reset link</Text>
                <Text className="text-sm leading-6 text-slate-400">Connecting securely to Supabase…</Text>
              </View>
            ) : status === 'updated' ? (
              <View accessibilityLiveRegion="polite" className="gap-4">
                <View className="gap-2">
                  <Text className="text-xs font-bold uppercase tracking-widest text-emerald-300">Password changed</Text>
                  <Text className="text-2xl font-black text-white">You are all set</Text>
                  <Text className="text-sm leading-6 text-slate-300">
                    Your password has been updated. Continue to your team with your new password saved to your account.
                  </Text>
                </View>
                <Button label="Continue to Fantasy Dota 2" onPress={() => router.replace('/(tabs)')} />
              </View>
            ) : status === 'error' ? (
              <View className="gap-4">
                <View className="gap-2">
                  <Text className="text-xs font-bold uppercase tracking-widest text-red-300">Link unavailable</Text>
                  <Text className="text-2xl font-black text-white">Request a new link</Text>
                  <Text accessibilityRole="alert" className="text-sm leading-6 text-red-200">
                    {verificationError}
                  </Text>
                </View>
                <Link href="/forgot-password" asChild>
                  <Button label="Request another reset link" />
                </Link>
              </View>
            ) : (
              <>
                <View className="gap-2">
                  <Text className="text-xs font-bold uppercase tracking-widest text-amber-300">Secure account recovery</Text>
                  <Text className="text-2xl font-black text-white">Choose a new password</Text>
                  <Text className="text-sm leading-6 text-slate-400">Set a password with at least 8 characters.</Text>
                </View>
                {formError ? (
                  <Text accessibilityRole="alert" className="text-sm text-red-300">{formError}</Text>
                ) : null}
                <AuthInput
                  label="New password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  textContentType="newPassword"
                  value={password}
                  hint="Use at least 8 characters."
                />
                <PasswordStrength password={password} />
                <AuthInput
                  label="Confirm new password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onChangeText={setConfirmPassword}
                  placeholder="Enter your new password again"
                  secureTextEntry
                  textContentType="newPassword"
                  value={confirmPassword}
                />
                <Button
                  disabled={!password || !confirmPassword}
                  label="Update password"
                  loading={isSubmitting}
                  onPress={() => void savePassword()}
                />
              </>
            )}
            {status !== 'updated' ? (
              <Link href="/sign-in" className="self-center py-2">
                <Text className="text-sm font-semibold text-brand-300">Back to sign in</Text>
              </Link>
            ) : null}
          </View>
        </AuthCard>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
