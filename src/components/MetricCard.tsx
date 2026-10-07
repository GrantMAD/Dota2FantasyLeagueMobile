import { Text, View } from 'react-native';

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
}

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <View className="min-h-28 flex-1 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</Text>
      <Text accessibilityRole="text" className="mt-2 text-2xl font-bold text-white">{value}</Text>
      {detail ? <Text className="mt-1 text-xs text-slate-400">{detail}</Text> : null}
    </View>
  );
}
