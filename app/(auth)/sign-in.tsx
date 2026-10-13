import { Link, Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthBackground } from '@/src/components/auth/AuthBackground';
import { AuthCard } from '@/src/components/auth/AuthCard';
import { AuthInput } from '@/src/components/auth/AuthInput';
import { useAuth } from '@/src/lib/auth';
import { managerReturnRoute } from '@/src/lib/deep-links';
import { NetworkStatusBanner } from '@/src/lib/connectivity';

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
    <AuthBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <NetworkStatusBanner />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand header */}
            <View style={styles.header}>
              <Image
                accessibilityLabel="Fantasy Dota 2 logo"
                style={styles.logo}
                resizeMode="contain"
                source={require('../../assets/images/brand-logo.png')}
              />
              <Text style={styles.appName}>Fantasy Dota 2</Text>
              <Text style={styles.tagline}>Your arena awaits</Text>
            </View>

            {/* Auth card */}
            <AuthCard style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardSubtitle}>Sign in to manage your fantasy team</Text>

                {!ready ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator accessibilityLabel="Restoring session" color="#14b8a6" />
                    <Text style={styles.loadingText}>Restoring session…</Text>
                  </View>
                ) : configurationError ? (
                  <View style={styles.configError} accessibilityRole="alert">
                    <Text style={styles.configErrorTitle}>Setup required</Text>
                    <Text style={styles.configErrorBody}>{configurationError}</Text>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <AuthInput
                      label="Email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      returnKeyType="next"
                      textContentType="emailAddress"
                      value={email}
                    />

                    <AuthInput
                      label="Password"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      onChangeText={setPassword}
                      onSubmitEditing={() => void handleSignIn()}
                      placeholder="Enter your password"
                      returnKeyType="done"
                      secureTextEntry
                      textContentType="password"
                      value={password}
                      error={errorMessage}
                    />

                    <Link href="/forgot-password" style={styles.forgotLink}>
                      Forgot password?
                    </Link>

                    {/* Sign-in button */}
                    <Pressable
                      onPress={() => void handleSignIn()}
                      disabled={submitting || !email.trim() || !password}
                      accessibilityRole="button"
                      accessibilityLabel="Sign in"
                      accessibilityState={{ disabled: submitting || !email.trim() || !password, busy: submitting }}
                      style={({ pressed }) => [
                        styles.signInButton,
                        (submitting || !email.trim() || !password) && styles.signInButtonDisabled,
                        pressed && styles.signInButtonPressed,
                      ]}
                    >
                      {submitting ? (
                        <View style={styles.buttonRow}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.signInButtonText}>Signing in…</Text>
                        </View>
                      ) : (
                        <Text style={styles.signInButtonText}>Sign in</Text>
                      )}
                    </Pressable>

                    {/* Divider */}
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <Link href="/(auth)/sign-up" style={styles.createLink}>
                      Create a free account
                    </Link>
                  </View>
                )}
              </View>
            </AuthCard>

            {/* Trust footer */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Text style={styles.trustDot}>●</Text>
                <Text style={styles.trustText}>Fair play verified</Text>
              </View>
              <View style={styles.trustItem}>
                <Text style={styles.trustDot}>●</Text>
                <Text style={styles.trustText}>Season 2026 active</Text>
              </View>
              <View style={styles.trustItem}>
                <Text style={styles.trustDot}>●</Text>
                <Text style={styles.trustText}>Live data</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  // Brand header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },

  // Card
  card: {
    marginBottom: 20,
  },
  cardContent: {
    padding: 24,
    paddingTop: 28,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },

  // Loading / config error
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  configError: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78350f',
    backgroundColor: 'rgba(69, 26, 3, 0.6)',
    padding: 14,
  },
  configErrorTitle: {
    fontWeight: '600',
    color: '#fde68a',
    marginBottom: 4,
  },
  configErrorBody: {
    fontSize: 13,
    color: '#fef3c7',
  },

  // Form
  form: {
    gap: 14,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
    textAlign: 'right',
    marginTop: -4,
  },

  // Button
  signInButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  signInButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  signInButtonPressed: {
    opacity: 0.82,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  dividerText: {
    fontSize: 12,
    color: '#475569',
  },

  createLink: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    paddingVertical: 2,
  },

  // Trust footer
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustDot: {
    fontSize: 5,
    color: '#14b8a6',
  },
  trustText: {
    fontSize: 11,
    color: '#475569',
  },
});
