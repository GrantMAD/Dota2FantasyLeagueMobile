import { Text, View } from 'react-native';

interface PendingFantasyScoreNoticeProps {
  hasPlayerStats: boolean;
  hasFantasyBreakdown: boolean;
}

export function PendingFantasyScoreNotice({
  hasPlayerStats,
  hasFantasyBreakdown,
}: PendingFantasyScoreNoticeProps) {
  if (!hasPlayerStats || hasFantasyBreakdown) return null;

  return (
    <View
      accessibilityRole="alert"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
    >
      <Text className="text-sm text-amber-200">
        Fantasy points for this match have not been calculated yet. Please check back soon.
      </Text>
    </View>
  );
}
