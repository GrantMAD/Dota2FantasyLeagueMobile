import { useEffect, useRef, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { AuthCard } from '@/src/components/auth/AuthCard';
import { Button } from '@/src/components/Button';
import { exchangeMobileAuthCode } from '@/src/features/account/api';

type CallbackStatus = 'verifying' | 'confirmed' | 'error';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error_code?: string | string[];
  }>();
  const router = useRouter();
  const code = firstParam(params.code);
  const errorCode = firstParam(params.error_code);
  const [verification, setVerification] = useState<{ code: string; error?: string } | null>(null);
  const processedCode = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!errorCode && code && processedCode.current !== code) {
      processedCode.current = code;
      void exchangeMobileAuthCode(code).then(() => {
        if (active) setVerification({ code });
      }).catch((error: unknown) => {
        if (!active) return;
        setVerification({
          code,
          error: error instanceof Error ? error.message : 'Unable to verify this account confirmation link.',
        });
      });
    }
    return () => {
      active = false;
    };
  }, [code, errorCode]);

  const errorMessage = errorCode
    ? 'This confirmation link is invalid or has expired. Try signing in or creating your account again.'
    : !code
      ? 'The confirmation link is missing its verification code. Try signing in or creating your account again.'
      : verification?.code === code
        ? verification.error ?? null
        : null;
  const status: CallbackStatus = errorMessage
    ? 'error'
    : code && verification?.code === code
      ? 'confirmed'
      : 'verifying';

  return (
    <AuthBackground>
      <View className="flex-1 justify-center px-5 py-8">
        <AuthCard>
          <View className="gap-4 p-5">
            {status === 'verifying' ? (
              <>
                <Text className="text-xs font-bold uppercase tracking-widest text-amber-300">Account confirmation</Text>
                <Text className="text-2xl font-black text-white">Verifying your email</Text>
                <Text className="text-sm leading-6 text-slate-400">Connecting securely to Supabase…</Text>
              </>
            ) : status === 'confirmed' ? (
              <>
                <Text className="text-xs font-bold uppercase tracking-widest text-emerald-300">Email confirmed</Text>
                <Text className="text-2xl font-black text-white">Welcome to the arena</Text>
                <Text className="text-sm leading-6 text-slate-300">
                  Your email is confirmed and your account is ready.
                </Text>
                <Button label="Continue to Fantasy Dota 2" onPress={() => router.replace('/(tabs)')} />
              </>
            ) : (
              <>
                <Text className="text-xs font-bold uppercase tracking-widest text-red-300">Confirmation unavailable</Text>
                <Text className="text-2xl font-black text-white">Unable to verify email</Text>
                <Text accessibilityRole="alert" className="text-sm leading-6 text-red-200">
                  {errorMessage}
                </Text>
                <Link href="/sign-in" asChild>
                  <Button label="Back to sign in" />
                </Link>
                <Link href="/sign-up" className="self-center py-2">
                  <Text className="text-sm font-semibold text-brand-300">Create another account</Text>
                </Link>
              </>
            )}
          </View>
        </AuthCard>
      </View>
    </AuthBackground>
  );
}
