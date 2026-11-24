import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';

export type AuthFeedbackType = 'error' | 'success';

interface AuthFeedbackProps {
  children: ReactNode;
  type: AuthFeedbackType;
}

export function AuthFeedback({ children, type }: AuthFeedbackProps) {
  const isError = type === 'error';

  useEffect(() => {
    if (!isError && Platform.OS === 'ios' && typeof children === 'string') {
      AccessibilityInfo.announceForAccessibility(children);
    }
  }, [children, isError]);

  return (
    <View
      testID={`auth-feedback-${type}`}
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      className={`flex-row items-start gap-2 rounded-xl border p-3 ${
        isError ? 'border-red-500/30 bg-red-950/40' : 'border-emerald-500/30 bg-emerald-950/30'
      }`}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        className={`h-5 w-5 items-center justify-center rounded-full border ${
          isError ? 'border-red-300/60' : 'border-emerald-300/60'
        }`}
      >
        <Text className={`text-xs font-black ${isError ? 'text-red-200' : 'text-emerald-200'}`}>
          {isError ? '!' : '✓'}
        </Text>
      </View>
      <Text className={`flex-1 text-sm leading-5 ${isError ? 'text-red-200' : 'text-emerald-200'}`}>
        {children}
      </Text>
    </View>
  );
}
