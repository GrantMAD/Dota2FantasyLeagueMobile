import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DataFreshnessModal } from '../src/components/DataFreshnessModal';

jest.mock('../src/lib/theme', () => ({
  useMobileTheme: () => ({ theme: 'dark' }),
  themeVariables: { dark: {} },
}));

describe('DataFreshnessModal', () => {
  it('shows a refreshable request error instead of reporting an empty job list', () => {
    const onRefresh = jest.fn();
    const view = render(
      <DataFreshnessModal
        visible
        onClose={jest.fn()}
        freshness={undefined}
        isLoading={false}
        isRefetching={false}
        error={new Error('Freshness service unavailable')}
        onRefresh={onRefresh}
      />,
    );

    expect(view.getByText('Unable to refresh sync status')).toBeTruthy();
    expect(view.getByText('Freshness service unavailable')).toBeTruthy();
    expect(view.queryByText('No specific background jobs tracked for this screen.')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'Refresh sync status' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
