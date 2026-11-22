import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

export function DashboardGreeting({
  loading,
  displayName,
}: {
  loading: boolean;
  displayName?: string | null;
}) {
  return (
    <View accessibilityLiveRegion="polite" aria-busy={loading}>
      <Text className="mt-2 text-3xl font-bold text-white">
        Welcome back
        {loading ? (
          <Text
            accessibilityLabel="Loading manager name"
            className="ml-2 rounded-md bg-slate-700"
          >
            {'         '}
          </Text>
        ) : `, ${displayName?.trim() || 'Manager'}`}
      </Text>
    </View>
  );
}

export function LineupProgress({ starters }: { starters: number }) {
  const filled = Math.max(0, Math.min(5, starters));
  return (
    <View accessibilityLabel={`${filled} of 5 starting slots filled`} className="flex-row items-center gap-1.5">
      {[0, 1, 2, 3, 4].map((slot) => (
        <View
          key={slot}
          accessibilityLabel={slot < filled ? `Starting slot ${slot + 1} filled` : `Starting slot ${slot + 1} empty`}
          className={`h-2 flex-1 rounded-full ${slot < filled ? 'bg-emerald-400' : 'border border-slate-600 bg-slate-900'}`}
        />
      ))}
    </View>
  );
}

export function CaptainScoringGuide() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Explain captain scoring"
        className="min-h-9 flex-row items-center justify-between"
        onPress={() => setExpanded((current) => !current)}
      >
        <Text className="text-xs font-semibold text-amber-300">How captain scoring works</Text>
        <Text className="text-xs font-bold text-amber-300">{expanded ? '−' : '?'}</Text>
      </Pressable>
      {expanded ? (
        <Text className="text-xs leading-5 text-slate-400">
          The Captain receives double fantasy points. The Vice-captain receives double points only if no Captain is available or the Captain fails to score.
        </Text>
      ) : null}
    </View>
  );
}

export function getPointTrend(trend: { userScore: number }[]): string {
  if (trend.length < 2) return 'Not enough gameweek history';
  const delta = trend[trend.length - 1].userScore - trend[trend.length - 2].userScore;
  if (Math.abs(delta) < 0.05) return 'No change from last GW';
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pts vs last GW`;
}

export function getRankTrend(trend: { rank?: number | null }[]): string {
  if (trend.length < 2) return 'Not enough rank history';
  const previous = trend[trend.length - 2].rank;
  const current = trend[trend.length - 1].rank;
  if (current == null || previous == null) return 'Rank unavailable';
  if (current === previous) return 'Rank unchanged from last GW';
  const movement = previous - current;
  return movement > 0
    ? `Up ${movement} ${movement === 1 ? 'place' : 'places'} vs last GW`
    : `Down ${Math.abs(movement)} ${Math.abs(movement) === 1 ? 'place' : 'places'} vs last GW`;
}
