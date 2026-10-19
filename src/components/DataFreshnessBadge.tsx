import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useMobileTheme } from '@/src/lib/theme';
import {
  fetchDataFreshness,
  formatCountdown,
  formatRelativeTime,
  type FreshnessData,
} from '@/src/lib/freshness';
import { DataFreshnessModal } from '@/src/components/DataFreshnessModal';

export interface DataFreshnessBadgeProps {
  page: string;
  className?: string;
}

export function DataFreshnessBadge({ page, className }: DataFreshnessBadgeProps) {
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';

  const [modalVisible, setModalVisible] = useState(false);
  const [currentNow, setCurrentNow] = useState(() => new Date());

  // Screen focus tracker to pause polling and local tick timers when not focused
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Pulse animation for the green/emerald indicator dot
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [pulseAnim]);

  // Query freshness data from endpoint with 2m background polling
  const {
    data: freshness,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<FreshnessData>({
    queryKey: ['data-freshness', page],
    queryFn: () => fetchDataFreshness(page),
    staleTime: 60_000,
    refetchInterval: isScreenFocused ? 2 * 60_000 : false,
    retry: 1,
  });

  // Local ticker every 15s to update relative times & countdown smoothly
  useEffect(() => {
    if (!isScreenFocused) return;
    const interval = setInterval(() => {
      setCurrentNow(new Date());
    }, 15_000);
    return () => clearInterval(interval);
  }, [isScreenFocused]);

  const relativeTime = formatRelativeTime(freshness?.lastUpdated, currentNow);
  const countdown = formatCountdown(freshness?.nextUpdate, currentNow);

  return (
    <>
      <Pressable
        accessibilityLabel={`Data sync status. Updated ${relativeTime}, next sync ${countdown}. Tap for details.`}
        accessibilityRole="button"
        onPress={() => setModalVisible(true)}
        className={`flex-row items-center self-start rounded-full border px-3 py-1.5 active:opacity-80 ${
          isDark
            ? 'border-slate-800 bg-slate-900/80'
            : 'border-slate-300 bg-slate-100/90'
        } ${className ?? ''}`}
      >
        {/* Pulsing Emerald Dot */}
        <View className="mr-2 h-2.5 w-2.5 items-center justify-center">
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
            className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500/40"
          />
          <View className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </View>

        {/* Status text */}
        <Text className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Updated <Text className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{relativeTime}</Text>
          {' '}&bull;{' '}Next sync <Text className="font-semibold text-brand-300">{countdown}</Text>
        </Text>

        {/* Trailing Info Capsule */}
        <View className="ml-2 h-4 w-4 items-center justify-center rounded-full bg-teal-500/20">
          <Text className="text-[10px] font-bold text-teal-400">i</Text>
        </View>
      </Pressable>

      <DataFreshnessModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        freshness={freshness}
        isLoading={isLoading}
        isRefetching={isRefetching}
        onRefresh={() => void refetch()}
      />
    </>
  );
}
