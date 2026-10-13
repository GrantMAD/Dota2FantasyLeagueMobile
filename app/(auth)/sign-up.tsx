import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { PasswordStrength } from '@/src/components/auth/PasswordStrength';
import { NetworkStatusBanner } from '@/src/lib/connectivity';
import { createManagerAccount } from '@/src/features/account/api';

const SQUAD_PREVIEW = [
  { role: 'Carry',    initials: 'CS', color: '#f59e0b' },
  { role: 'Mid',      initials: 'AM', color: '#14b8a6' },
  { role: 'Offlane', initials: 'VP', color: '#8b5cf6' },
];

/** Mini squad card shown on the success screen to reinforce the platform promise */
function MiniSquadPreview() {
  return (
    <View style={preview.card}>
      <Text style={preview.label}>Your future squad</Text>
      {SQUAD_PREVIEW.map(({ role, initials, color }) => (
        <View key={role} style={preview.row}>
          <View style={[preview.avatar, { backgroundColor: color + '26' }]}>
            <Text style={[preview.avatarText, { color }]}>{initials}</Text>
          </View>
          <View style={preview.info}>
            <Text style={preview.roleName}>{role}</Text>
            <Text style={preview.pts}>-- pts</Text>
          </View>
          <View style={[preview.dot, { backgroundColor: color }]} />
        </View>
      ))}
    </View>
  );
}

const preview = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    padding: 14,
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  roleName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  pts: {
    fontSize: 11,
    color: '#475569',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
});

/** Animated success overlay shown after account creation */
function SuccessOverlay({ message, onBack }: { message: string; onBack: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={success.overlay}>
      <Image
        source={require('../../assets/images/brand-logo.png')}
        style={success.logo}
        resizeMode="contain"
        accessibilityLabel="Fantasy Dota 2 logo"
      />
      <Text style={success.title}>Account created!</Text>
      <Text style={success.subtitle}>{message}</Text>

      {/* Progress bar */}
      <View style={success.progressTrack}>
        <Animated.View
          style={[
            success.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to sign in"
        style={({ pressed }) => [success.button, pressed && { opacity: 0.8 }]}
      >
        <Text style={success.buttonText}>Back to sign in</Text>
      </Pressable>
    </View>
  );
}

const success = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressTrack: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#14b8a6',
  },
  button: {
    marginTop: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#14b8a6',
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#14b8a6',
    fontSize: 15,
    fontWeight: '700',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

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
    <AuthBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <NetworkStatusBanner />

        {created ? (
          <SuccessOverlay
            message={confirmationMessage}
            onBack={() => router.replace('/(auth)/sign-in')}
          />
        ) : (
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
                <Text style={styles.appName}>Join the Arena</Text>
                <Text style={styles.tagline}>Free to play · Live pro Dota 2 data</Text>
              </View>

              {/* Mini squad preview */}
              <MiniSquadPreview />

              {/* Bullet value props */}
              <View style={styles.bullets}>
                {[
                  { icon: '⚡', text: 'Real pro Dota 2 stats every gameweek' },
                  { icon: '🏆', text: 'Compete in global & private leagues' },
                  { icon: '💸', text: 'Free to play — no credit card needed' },
                ].map(({ icon, text }) => (
                  <View key={text} style={styles.bulletRow}>
                    <Text style={styles.bulletIcon}>{icon}</Text>
                    <Text style={styles.bulletText}>{text}</Text>
                  </View>
                ))}
              </View>

              {/* Registration card */}
              <AuthCard style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Create your account</Text>
                  <Text style={styles.cardSubtitle}>
                    Use the same account on web and mobile
                  </Text>

                  <View style={styles.form}>
                    <AuthInput
                      label="Email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      textContentType="emailAddress"
                      value={email}
                    />

                    <AuthInput
                      label="Username"
                      autoCapitalize="none"
                      autoComplete="username"
                      autoCorrect={false}
                      onChangeText={setUsername}
                      placeholder="Choose a manager name"
                      textContentType="username"
                      value={username}
                    />

                    <View>
                      <AuthInput
                        label="Password"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        onChangeText={setPassword}
                        placeholder="At least 8 characters"
                        secureTextEntry
                        textContentType="newPassword"
                        value={password}
                        error={errorMessage}
                        hint="Minimum 8 characters"
                      />
                      <PasswordStrength password={password} />
                    </View>

                    {/* Create account button */}
                    <Pressable
                      onPress={() => void handleSignUp()}
                      disabled={submitting || !email.trim() || !username.trim() || !password}
                      accessibilityRole="button"
                      accessibilityLabel="Create account"
                      accessibilityState={{
                        disabled: submitting || !email.trim() || !username.trim() || !password,
                        busy: submitting,
                      }}
                      style={({ pressed }) => [
                        styles.createButton,
                        (submitting || !email.trim() || !username.trim() || !password) &&
                          styles.createButtonDisabled,
                        pressed && styles.createButtonPressed,
                      ]}
                    >
                      {submitting ? (
                        <View style={styles.buttonRow}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.createButtonText}>Creating account…</Text>
                        </View>
                      ) : (
                        <Text style={styles.createButtonText}>Create account — it's free</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </AuthCard>

              <Link href="/(auth)/sign-in" style={styles.signInLink}>
                Already have an account? Sign in
              </Link>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: 0.4,
  },
  tagline: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },

  // Bullets
  bullets: {
    gap: 8,
    paddingHorizontal: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },

  // Card
  card: {},
  cardContent: {
    padding: 22,
    paddingTop: 26,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  form: {
    gap: 14,
  },

  // Button
  createButton: {
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
  createButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  createButtonPressed: {
    opacity: 0.82,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  signInLink: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
    paddingBottom: 8,
  },
});
