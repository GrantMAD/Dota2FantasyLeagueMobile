import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DataFreshnessModal } from '../src/components/DataFreshnessModal';

jest.mock('../src/lib/theme', () => ({
  useMobileTheme: () => ({ theme: 'dark' }),
  themeVariables: { dark: {} },
}));

describe('DataFreshnessModal', () => {
  it('labels schedule and device-local times and identifies the next scheduled job', () => {
    const nextUpdate = '2026-10-19T12:15:00.000Z';
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
    const exactNext = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(nextUpdate));
    const view = render(
      <DataFreshnessModal
        visible
        onClose={jest.fn()}
        freshness={{
          success: true,
          page: 'matches',
          lastUpdated: null,
          nextUpdate,
          jobName: 'fetch-matches',
          serverTime: '2026-10-19T12:07:00.000Z',
          jobs: [{
            jobName: 'fetch-matches',
            title: 'Match Schedule & Series',
            description: 'Discovers new matches, series status & winner updates',
            schedule: '*/15 * * * *',
            status: 'idle',
            lastRun: null,
            nextRun: nextUpdate,
          }],
        }}
        isLoading={false}
        isRefetching={false}
        error={null}
        onRefresh={jest.fn()}
      />,
    );

    expect(view.getByText(`Schedules use UTC; clock times use ${timeZone}`)).toBeTruthy();
    expect(view.getByText('Cron: */15 * * * * UTC')).toBeTruthy();
    expect(view.getByText(exactNext)).toBeTruthy();
    expect(view.getByText('Next job: Match Schedule & Series')).toBeTruthy();
  });

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
