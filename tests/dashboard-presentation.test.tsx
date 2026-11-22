import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CaptainScoringGuide,
  DashboardGreeting,
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
    expect(view.getByText(/The Captain receives double fantasy points/)).toBeTruthy();
  });

  it('formats points and rank trends from the latest two gameweeks', () => {
    expect(getPointTrend([{ userScore: 30 }, { userScore: 38 }])).toBe('+8.0 pts vs last GW');
    expect(getPointTrend([{ userScore: 30 }, { userScore: 30 }])).toBe('No change from last GW');
    expect(getRankTrend([{ rank: 20 }, { rank: 16 }])).toBe('Up 4 places vs last GW');
    expect(getRankTrend([{ rank: 16 }, { rank: 18 }])).toBe('Down 2 places vs last GW');
  });
});
