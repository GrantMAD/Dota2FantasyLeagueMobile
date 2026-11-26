import React from 'react';
import { render } from '@testing-library/react-native';
import { DashboardTransferredOutBanner } from '../src/features/dashboard/DashboardTransferredOutBanner';

describe('DashboardTransferredOutBanner', () => {
  const starters = [
    {
      player_id: 17,
      professional_players: { name: 'Inspiration is coming', in_game_name: null },
    },
    {
      player_id: 18,
      professional_players: { name: 'elmo^^', in_game_name: null },
    },
  ];

  it('names transferred-out starters and explains next-gameweek availability', () => {
    const view = render(
      <DashboardTransferredOutBanner starters={starters} ownedPlayerIds={[18]} isDark />,
    );

    expect(view.getByText('No longer in your squad: Inspiration is coming')).toBeTruthy();
    expect(
      view.getByText(
        "These players remain in this gameweek's saved lineup but won't be available for the next gameweek.",
      ),
    ).toBeTruthy();
    expect(view.queryByText('No longer in your squad: elmo^^')).toBeNull();
  });

  it('renders nothing when every starter is still in the squad', () => {
    const view = render(
      <DashboardTransferredOutBanner starters={starters} ownedPlayerIds={[17, 18]} isDark />,
    );

    expect(view.toJSON()).toBeNull();
  });
});
