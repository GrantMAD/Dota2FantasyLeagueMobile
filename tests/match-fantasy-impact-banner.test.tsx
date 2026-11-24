import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MatchFantasyImpactBanner } from '@/src/features/competition/MatchFantasyImpactBanner';
import type { MatchDetails } from '@/src/features/competition/api';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

const sampleGames: MatchDetails[] = [
  {
    match: {
      id: 607,
      series_id: 523,
      status: 'completed',
      scheduled_at: '2026-11-24T13:57:34Z',
      duration_seconds: 2100,
      gameweek_id: 7,
      match_number: 1,
      best_of: 3,
      radiant_team_id: 167,
      dire_team_id: 2,
      winner_team_id: 167,
      player_ids: [178, 42],
      radiant_team: { name: '1win', tag: '1WIN' },
      dire_team: { name: 'Team Yandex', tag: 'YDX' },
      tournament: { id: 77, name: 'BLAST SLAM IX', tier: 'Professional' },
    },
    seriesMatches: [],
    playerStats: [
      {
        id: 1,
        player_id: 178,
        team_id: 2,
        hero_name: 'Slark',
        kills: 8,
        deaths: 2,
        assists: 10,
        gold_per_minute: 620,
        experience_per_minute: 700,
        hero_damage: 25000,
        player: { id: 178, name: 'watson', in_game_name: 'watson' },
      },
      {
        id: 2,
        player_id: 42,
        team_id: 2,
        hero_name: 'Dazzle',
        kills: 2,
        deaths: 3,
        assists: 18,
        gold_per_minute: 350,
        experience_per_minute: 420,
        hero_damage: 9000,
        player: { id: 42, name: 'Maladych', in_game_name: 'Maladych' },
      },
    ],
    fantasyBreakdown: [
      { player_id: 178, total_points: 40.7 },
      { player_id: 42, total_points: 39.9 },
    ],
  },
];

describe('MatchFantasyImpactBanner (mobile)', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('toggles an inline bench-scoring explanation when pressing the bench info button without navigating', () => {
    const view = render(
      <MatchFantasyImpactBanner
        games={sampleGames}
        impact={{
          userOwnedPlayerIds: [178, 42],
          tripleCaptainActive: false,
          lineupDetails: [
            {
              playerId: 178,
              slot: 'Bench 1',
              isCaptain: false,
              isViceCaptain: false,
              isStarter: false,
            },
            {
              playerId: 42,
              slot: 'Hard Support',
              isCaptain: false,
              isViceCaptain: false,
              isStarter: true,
            },
          ],
        }}
      />,
    );

    const infoButton = view.getByRole('button', { name: 'Explain bench scoring for watson' });
    expect(view.queryByRole('button', { name: 'Explain bench scoring for Maladych' })).toBeNull();
    expect(view.queryByText('Why Bench players show 0.0 pts here')).toBeNull();

    fireEvent.press(infoButton);
    expect(view.getByText('Why Bench players show 0.0 pts here')).toBeTruthy();
    expect(view.getByText(/Bench Boost is active/i)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(infoButton);
    expect(view.queryByText('Why Bench players show 0.0 pts here')).toBeNull();

    fireEvent.press(view.getByRole('link', { name: 'View watson profile' }));
    expect(mockPush).toHaveBeenCalledWith('/player/178');
  });
});
