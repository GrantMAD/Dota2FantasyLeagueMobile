import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { FantasyLineupEntry, FantasyPlayer } from '../src/features/fantasy/api';
import { SquadRosterView } from '../src/features/fantasy/SquadRosterView';

function player(id: number, role: string): FantasyPlayer {
  return {
    id,
    name: `Player ${id}`,
    in_game_name: null,
    primary_role: role,
    profile_image_url: null,
    professional_teams: null,
    availability_status: 'available',
    availability_reason: null,
    current_price: 8,
    last_gw_points: 10,
    recent_points: 9,
  };
}

function entry(playerId: number, slot: string, captain = false, viceCaptain = false): FantasyLineupEntry {
  return {
    player_id: playerId,
    slot,
    is_starter: !slot.startsWith('bench'),
    is_captain: captain,
    is_vice_captain: viceCaptain,
    professional_players: null,
  };
}

describe('SquadRosterView', () => {
  const players = [
    player(1, 'carry'),
    player(2, 'mid'),
    player(3, 'offlane'),
    player(4, 'support'),
    player(5, 'hard_support'),
    player(6, 'mid'),
  ];
  const lineup = [
    entry(1, 'carry', true),
    entry(2, 'mid', false, true),
    entry(3, 'offlane'),
    entry(4, 'support'),
    entry(5, 'hard_support'),
  ];

  it('shows the starting roles and bench in pitch view', () => {
    const view = render(<SquadRosterView players={players} lineup={lineup} />);

    expect(view.getByLabelText('Tactical starting lineup')).toBeTruthy();
    expect(view.getByText('Carry · Pos 1')).toBeTruthy();
    expect(view.getByText('Bench / Reserves')).toBeTruthy();
    expect(view.getByText('Player 6')).toBeTruthy();
  });

  it('filters the compact roster by role and starter or bench status', () => {
    const view = render(<SquadRosterView players={players} lineup={lineup} />);
    fireEvent.press(view.getByRole('tab', { name: 'Grid view' }));
    fireEvent.press(view.getByRole('tab', { name: 'Starting 5 5' }));
    fireEvent.press(view.getByRole('button', { name: 'mid' }));

    expect(view.getByText('Player 2')).toBeTruthy();
    expect(view.queryByText('Player 6')).toBeNull();
    fireEvent.press(view.getByRole('tab', { name: 'Bench 1' }));
    expect(view.getByText('Player 6')).toBeTruthy();
    expect(view.queryByText('Player 2')).toBeNull();
  });

  it('suggests a role layout when the squad has no saved lineup', () => {
    const view = render(<SquadRosterView players={players} lineup={[]} />);

    expect(view.getByText('Suggested role layout · not saved to your lineup')).toBeTruthy();
    expect(view.getByText('Starting 5 5')).toBeTruthy();
    expect(view.getByText('Bench 1')).toBeTruthy();
  });
});
