import { Text, View } from 'react-native';
import { useMobileTheme } from '@/src/lib/theme';
import type { FixtureDifficultyResult } from './fixture-difficulty';

interface FixtureDifficultyBadgeProps {
  difficulty: FixtureDifficultyResult | undefined;
}

const DARK_RATING_STYLES: Record<number, { backgroundColor: string; borderColor: string; color: string }> = {
  1: { backgroundColor: '#064e3b', borderColor: '#10b981', color: '#a7f3d0' },
  2: { backgroundColor: '#365314', borderColor: '#84cc16', color: '#d9f99d' },
  3: { backgroundColor: '#78350f', borderColor: '#f59e0b', color: '#fde68a' },
  4: { backgroundColor: '#7c2d12', borderColor: '#f97316', color: '#fed7aa' },
  5: { backgroundColor: '#881337', borderColor: '#f43f5e', color: '#fecdd3' },
};

const LIGHT_RATING_STYLES: Record<number, { backgroundColor: string; borderColor: string; color: string }> = {
  1: { backgroundColor: '#d1fae5', borderColor: '#059669', color: '#065f46' },
  2: { backgroundColor: '#ecfccb', borderColor: '#65a30d', color: '#365314' },
  3: { backgroundColor: '#fef3c7', borderColor: '#d97706', color: '#78350f' },
  4: { backgroundColor: '#ffedd5', borderColor: '#ea580c', color: '#7c2d12' },
  5: { backgroundColor: '#ffe4e6', borderColor: '#e11d48', color: '#881337' },
};

export function FixtureDifficultyBadge({ difficulty }: FixtureDifficultyBadgeProps) {
  const { theme } = useMobileTheme();
  const ratingStyles = theme === 'light' ? LIGHT_RATING_STYLES : DARK_RATING_STYLES;
  const unknownStyle = theme === 'light'
    ? { backgroundColor: '#e2e8f0', borderColor: '#94a3b8', color: '#334155' }
    : { backgroundColor: '#1e293b', borderColor: '#475569', color: '#cbd5e1' };
  const rating = difficulty?.rating ?? null;
  const label = difficulty?.label ?? 'Unknown';
  const title = rating === null || difficulty?.winRate === null
    ? 'Opponent form unavailable: at least five recent completed results are required.'
    : `Opponent won ${difficulty?.wins} of their last ${difficulty?.games} completed matches (${difficulty?.winRate}%).`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={rating === null
        ? 'Fixture difficulty unknown; fewer than five recent completed results'
        : `Fixture difficulty ${rating} of 5, ${label}; opponent win rate ${difficulty?.winRate}% over ${difficulty?.games} matches`}
      accessibilityHint={title}
      className="self-start flex-row items-center gap-1 rounded-full border px-2 py-1"
      style={rating === null
        ? { backgroundColor: unknownStyle.backgroundColor, borderColor: unknownStyle.borderColor }
        : ratingStyles[rating]}
    >
      <Text
        className="text-[11px] font-bold"
        style={{ color: rating === null ? unknownStyle.color : ratingStyles[rating].color }}
      >
        {rating === null ? '—' : `${rating}/5`} · {label}
      </Text>
    </View>
  );
}
