import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

/**
 * Cinematic auth screen background.
 * Renders a deep navy base with three pulsing ambient orbs (teal, amber, violet)
 * that slowly breathe using the Animated API — matching the web app aesthetic
 * without requiring canvas.
 */
export function AuthBackground({ children }: { children: ReactNode }) {
  const [orb1] = useState(() => new Animated.Value(0));
  const [orb2] = useState(() => new Animated.Value(0));
  const [orb3] = useState(() => new Animated.Value(0));
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      setReduceMotionEnabled(enabled);
    });

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active && !preferenceChanged) setReduceMotionEnabled(enabled);
      })
      .catch((error: unknown) => {
        if (!active || preferenceChanged) return;
        console.warn('Unable to read reduced-motion preference for auth background.', error);
        setReduceMotionEnabled(true);
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotionEnabled !== false) return;

    const createLoop = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ]),
      );
    const animations = [
      createLoop(orb1, 3200, 0),
      createLoop(orb2, 4000, 800),
      createLoop(orb3, 3600, 1600),
    ];
    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [orb1, orb2, orb3, reduceMotionEnabled]);

  const orbStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.38] }),
    transform: [
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }),
      },
    ],
  });

  return (
    <View style={styles.root}>
      {/* Deep base colour */}
      <View style={styles.base} />

      {/* Ambient orb — teal (top-left) */}
      <Animated.View style={[styles.orb, styles.orbTeal, orbStyle(orb1)]} />

      {/* Ambient orb — amber (bottom-right) */}
      <Animated.View style={[styles.orb, styles.orbAmber, orbStyle(orb2)]} />

      {/* Ambient orb — violet (top-right) */}
      <Animated.View style={[styles.orb, styles.orbViolet, orbStyle(orb3)]} />

      {/* Subtle grid overlay */}
      <View style={styles.gridOverlay} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05080f',
  },
  base: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#05080f',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbTeal: {
    width: 280,
    height: 280,
    top: -60,
    left: -80,
    backgroundColor: '#14b8a6', // teal-500
  },
  orbAmber: {
    width: 320,
    height: 320,
    bottom: -100,
    right: -100,
    backgroundColor: '#f59e0b', // amber-500
  },
  orbViolet: {
    width: 200,
    height: 200,
    top: 80,
    right: -60,
    backgroundColor: '#8b5cf6', // violet-500
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.03,
    backgroundColor: 'transparent',
  },
});
