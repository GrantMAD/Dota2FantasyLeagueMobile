import React from 'react';
import { render } from '@testing-library/react-native';
import { GettingStartedChecklist } from '@/src/features/dashboard/GettingStartedChecklist';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('GettingStartedChecklist', () => {
  it('shows each incomplete onboarding step and its action', () => {
    const { getByText } = render(
      <GettingStartedChecklist
        hasSquad={false}
        ownedPlayerCount={0}
        hasCompleteLineup={false}
        hasLeague={false}
      />,
    );

    expect(getByText('0 of 4')).toBeTruthy();
    expect(getByText('Create your fantasy squad')).toBeTruthy();
    expect(getByText('Fill your 8-player squad')).toBeTruthy();
    expect(getByText('Set five starters and a captain')).toBeTruthy();
    expect(getByText('Join a league')).toBeTruthy();
    expect(getByText('Create squad')).toBeTruthy();
    expect(getByText('Find a league')).toBeTruthy();
  });

  it('updates progress as the manager completes steps', () => {
    const { getByText, queryByText } = render(
      <GettingStartedChecklist
        hasSquad
        ownedPlayerCount={8}
        hasCompleteLineup
        hasLeague={false}
      />,
    );

    expect(getByText('3 of 4')).toBeTruthy();
    expect(queryByText('Create squad')).toBeNull();
    expect(getByText('Find a league')).toBeTruthy();
  });

  it('hides after all onboarding steps are complete', () => {
    const { toJSON } = render(
      <GettingStartedChecklist
        hasSquad
        ownedPlayerCount={8}
        hasCompleteLineup
        hasLeague
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
