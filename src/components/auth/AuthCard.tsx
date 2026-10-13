import { StyleSheet, View, type ViewProps } from 'react-native';

/**
 * Glassmorphism card for auth screens.
 * Uses a dark semi-transparent surface with a top teal/amber edge glow and subtle border —
 * matching the web app AuthCard aesthetic adapted for React Native.
 */
export function AuthCard({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {/* Top edge glow strip */}
      <View style={styles.topGlow} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // slate-900 / 85%
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)', // slate-400 / 12%
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#14b8a6', // teal-500 — matches the web brand alias
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
});
