import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AnalyticsExplainer } from '../src/features/analytics/AnalyticsExplainer';

describe('AnalyticsExplainer', () => {
  it('reveals and hides its explanation with expanded accessibility state', () => {
    const { getByRole, getByText, queryByText } = render(
      <AnalyticsExplainer title="How is ROI calculated?">
        <Text>Points divided by price, multiplied by 10.</Text>
      </AnalyticsExplainer>,
    );
    const toggle = getByRole('button', { name: 'How is ROI calculated?' });

    expect(queryByText('Points divided by price, multiplied by 10.')).toBeNull();
    expect(toggle.props.accessibilityState).toEqual({ expanded: false });

    fireEvent.press(toggle);

    expect(getByText('Points divided by price, multiplied by 10.')).toBeTruthy();
    expect(toggle.props.accessibilityState).toEqual({ expanded: true });

    fireEvent.press(toggle);

    expect(queryByText('Points divided by price, multiplied by 10.')).toBeNull();
  });
});
