import { useState, type PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';

export function AnalyticsExplainer({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="rounded-xl border border-slate-800 bg-slate-950/50 px-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        className="min-h-11 flex-row items-center justify-between gap-3"
        onPress={() => setExpanded((current) => !current)}
      >
        <Text className="flex-1 text-xs font-semibold text-brand-300">{title}</Text>
        <Text aria-hidden className="text-sm font-bold text-slate-400">{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View className="gap-2 border-t border-slate-800 py-3">
          {children}
        </View>
      ) : null}
    </View>
  );
}
