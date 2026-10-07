import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import { useMobileTheme } from '@/src/lib/theme';

interface ButtonProps extends Pick<PressableProps, 'onPress' | 'disabled' | 'accessibilityLabel'> {
  label: string;
  loading?: boolean;
}

export function Button({ label, loading = false, disabled = false, accessibilityLabel, ...pressableProps }: ButtonProps) {
  const { colors } = useMobileTheme();
  const unavailable = disabled || loading;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      className={`min-h-12 items-center justify-center rounded-xl bg-brand-500 px-4 ${
        unavailable ? 'opacity-50' : 'active:opacity-80'
      }`}
      disabled={unavailable}
    >
      {loading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator color={colors.onAccent} />
          <Text className="font-bold text-on-accent">{label}</Text>
        </View>
      ) : (
        <Text className="font-bold text-on-accent">{label}</Text>
      )}
    </Pressable>
  );
}
