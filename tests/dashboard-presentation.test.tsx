import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CaptainScoringGuide,
  DashboardRetryAlert,
  DashboardGreeting,
  getDashboardDetailColor,
  getPointTrend,
  getRankTrend,
  LineupProgress,
} from '@/src/features/dashboard/DashboardPresentation';

describe('Dashboard presentation parity', () => {
  it('shows a manager-name loading state and named fallback', () => {
    const loading = render(<DashboardGreeting loading displayName={null} />);
    expect(loading.getByText('Welcome back')).toBeTruthy();
    expect(loading.getByLabelText('Loading manager name')).toBeTruthy();

    loading.rerender(<DashboardGreeting loading={false} displayName="Teal Manager" />);
    expect(loading.getByText('Welcome back, Teal Manager')).toBeTruthy();
  });

  it('renders an accessible five-slot lineup progress indicator', () => {
    const view = render(<LineupProgress starters={3} />);
    expect(view.getByLabelText('3 of 5 starting slots filled')).toBeTruthy();
    expect(view.getByLabelText('Starting slot 3 filled')).toBeTruthy();
    expect(view.getByLabelText('Starting slot 4 empty')).toBeTruthy();
  });

  it('expands captain and vice-captain scoring guidance', () => {
    const view = render(<CaptainScoringGuide />);
    fireEvent.press(view.getByRole('button', { name: 'Explain captain scoring' }));
    expect(view.getByText(/no recorded match participation that gameweek/)).toBeTruthy();
    expect(view.queryByText(/fails to score/)).toBeNull();
  });

  it('retries a dashboard request from its accessible error alert', () => {
    const onRetry = jest.fn();
    const view = render(
      <DashboardRetryAlert
        title="Dashboard unavailable"
        message="Please try again."
        onRetry={onRetry}
      />,
    );

    fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('formats points and rank trends from the latest two gameweeks', () => {
    expect(getPointTrend([{ userScore: 30 }, { userScore: 38 }])).toEqual({
      text: '+8.0 pts vs last GW',
      direction: 'up',
    });
    expect(getPointTrend([{ userScore: 30 }, { userScore: 30 }])).toEqual({
      text: 'No change from last GW',
    });
    expect(getRankTrend([{ rank: 20 }, { rank: 16 }])).toEqual({
      text: 'Up 4 places vs last GW',
      direction: 'up',
    });
    expect(getRankTrend([{ rank: 16 }, { rank: 18 }])).toEqual({
      text: 'Down 2 places vs last GW',
      direction: 'down',
    });
    expect(getRankTrend([{ rank: 1 }, { rank: null }])).toEqual({
      text: 'Rank unavailable',
    });
  });

  it('uses readable theme-aware colors for neutral, accented, and directional details', () => {
    expect(getDashboardDetailColor({ isDark: true })).toBe('#94a3b8');
    expect(getDashboardDetailColor({ isDark: false })).toBe('#506070');
    expect(getDashboardDetailColor({ isDark: true, accent: '#22d3ee' })).toBe('#22d3ee');
    expect(getDashboardDetailColor({ isDark: false, accent: '#0e7490' })).toBe('#0e7490');
    expect(getDashboardDetailColor({ isDark: true, direction: 'up' })).toBe('#34d399');
    expect(getDashboardDetailColor({ isDark: false, direction: 'up' })).toBe('#047857');
    expect(getDashboardDetailColor({ isDark: true, direction: 'down' })).toBe('#fb7185');
    expect(getDashboardDetailColor({ isDark: false, direction: 'down' })).toBe('#be123c');
  });
});
