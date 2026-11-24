import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text } from 'react-native';
import { AuthBackground } from '../src/components/auth/AuthBackground';
import { AuthFeedback } from '../src/components/auth/AuthFeedback';
import { AuthInput } from '../src/components/auth/AuthInput';

describe('mobile auth accessibility', () => {
  it('associates input hints and errors and provides an accessible password visibility toggle', () => {
    const view = render(
      <AuthInput
        label="New password"
        secureTextEntry
        value="short"
        onChangeText={jest.fn()}
        hint="Use at least 8 characters."
        error="Your new password must be at least 8 characters."
      />,
    );
    const passwordInput = view.getByLabelText('New password');

    expect(passwordInput.props.accessibilityHint).toBe(
      'Your new password must be at least 8 characters. Use at least 8 characters.',
    );
    expect(view.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.getByText('Your new password must be at least 8 characters.')).toBeTruthy();

    fireEvent.press(view.getByRole('button', { name: 'Show new password' }));
    expect(passwordInput.props.secureTextEntry).toBe(false);
    expect(view.getByRole('button', { name: 'Hide new password' })).toBeTruthy();
  });

  it('announces success feedback as status and errors as alerts', () => {
    const view = render(
      <>
        <AuthFeedback type="success">Confirmation email sent.</AuthFeedback>
        <AuthFeedback type="error">Unable to resend the email.</AuthFeedback>
      </>,
    );

    const successFeedback = view.getByTestId('auth-feedback-success');
    const errorFeedback = view.getByTestId('auth-feedback-error');
    expect(successFeedback.props.accessibilityLiveRegion).toBe('polite');
    expect(successFeedback.props.accessibilityRole).toBe('text');
    expect(errorFeedback.props.accessibilityLiveRegion).toBe('assertive');
    expect(errorFeedback.props.accessibilityRole).toBe('alert');
  });

  it('does not animate the auth background when reduced motion is enabled', async () => {
    const preferenceQuery = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const animationLoop = jest.spyOn(Animated, 'loop');

    render(
      <AuthBackground>
        <Text>Sign in</Text>
      </AuthBackground>,
    );

    await waitFor(() => expect(preferenceQuery).toHaveBeenCalled());
    expect(animationLoop).not.toHaveBeenCalled();
  });
});
