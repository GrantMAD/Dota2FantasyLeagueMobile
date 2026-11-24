import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

/**
 * Auth input with accessible field feedback and an optional password visibility control.
 * Adapts the web AuthInput for React Native.
 */
export function AuthInput({ label, error, hint, style, ...inputProps }: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(inputProps.secureTextEntry);
  const passwordToggleLabel = `${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`;
  const fieldAccessibilityHint = [error, hint, inputProps.accessibilityHint]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          !!error && styles.inputContainerError,
        ]}
      >
        <TextInput
          {...inputProps}
          secureTextEntry={isPassword ? !passwordVisible : inputProps.secureTextEntry}
          accessibilityLabel={label}
          accessibilityHint={fieldAccessibilityHint}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor="rgba(148, 163, 184, 0.5)"
          style={[styles.input, isPassword && styles.inputWithPasswordToggle, style]}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordToggleLabel}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}
          >
            <Text style={styles.passwordToggleText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
      {error ? (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(203, 213, 225, 0.9)', // slate-300
    letterSpacing: 0.3,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(51, 65, 85, 0.8)', // slate-700
    backgroundColor: 'rgba(2, 6, 23, 0.6)', // near-black
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#14b8a6', // teal-500
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  inputContainerError: {
    borderColor: '#f87171', // red-400
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#f1f5f9', // slate-100
  },
  inputWithPasswordToggle: {
    paddingRight: 76,
  },
  passwordToggle: {
    position: 'absolute',
    top: 0,
    right: 4,
    bottom: 0,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordTogglePressed: {
    opacity: 0.65,
  },
  passwordToggleText: {
    color: '#5eead4',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: '#f87171', // red-400
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    color: '#64748b', // slate-500
    marginTop: 2,
  },
});
