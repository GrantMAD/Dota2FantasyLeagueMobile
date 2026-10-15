import { View, Text } from 'react-native';

interface AccountHealthProgressProps {
  completed: number;
  total: number;
  size?: number;
}

export function AccountHealthProgress({
  completed,
  total,
  size = 56,
}: AccountHealthProgressProps) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const percent = Math.round(fraction * 100);
  const isAllComplete = completed === total && total > 0;

  const borderColor = isAllComplete
    ? 'border-emerald-400'
    : fraction >= 0.5
      ? 'border-cyan-400'
      : 'border-amber-400';

  const badgeColor = isAllComplete
    ? 'text-emerald-300'
    : fraction >= 0.5
      ? 'text-cyan-300'
      : 'text-amber-300';

  return (
    <View
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full border-4 bg-slate-950/80 shadow-md ${borderColor}`}
      accessibilityLabel={`Account health: ${completed} of ${total} complete (${percent}%)`}
    >
      <Text className="text-xs font-black text-white">{completed}/{total}</Text>
      <Text className={`text-[9px] font-bold ${badgeColor}`}>{percent}%</Text>
    </View>
  );
}
