import { useState } from 'react';
import {
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
 * Premium auth input with teal focus ring, label, error message, and optional hint.
 * Adapts the web AuthInput for React Native.
 */
export function AuthInput({ label, error, hint, style, ...inputProps }: AuthInputProps) {
  const [focused, setFocused] = useState(false);

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
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor="rgba(148, 163, 184, 0.5)"
          style={[styles.input, style]}
        />
      </View>
      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
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
