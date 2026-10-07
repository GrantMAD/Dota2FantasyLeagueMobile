import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useMobileTheme } from '@/src/lib/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, ...inputProps }: TextFieldProps) {
  const { colors } = useMobileTheme();
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-slate-200">{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-4 text-base text-white"
        placeholderTextColor={inputProps.placeholderTextColor ?? colors.placeholder}
      />
    </View>
  );
}
