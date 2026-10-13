import { StyleSheet, Text, View } from 'react-native';

type Strength = 'none' | 'weak' | 'fair' | 'strong';

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): Strength {
  if (!password) return 'none';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score === 2 || score === 3) return 'fair';
  return 'strong';
}

const STRENGTH_CONFIG = {
  none:   { segments: 0, label: '',       color: '#334155' },
  weak:   { segments: 1, label: 'Weak',   color: '#f87171' }, // red-400
  fair:   { segments: 2, label: 'Fair',   color: '#f59e0b' }, // amber-500
  strong: { segments: 3, label: 'Strong', color: '#34d399' }, // emerald-400
};

/**
 * Three-segment password strength indicator — matches the web PasswordStrength component.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getStrength(password);
  const config = STRENGTH_CONFIG[strength];

  return (
    <View style={styles.wrapper}>
      <View style={styles.bars}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                backgroundColor:
                  i <= config.segments ? config.color : 'rgba(51, 65, 85, 0.6)',
              },
            ]}
          />
        ))}
      </View>
      {strength !== 'none' && (
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    minWidth: 36,
    textAlign: 'right',
  },
});
