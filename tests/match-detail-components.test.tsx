import React from 'react';
import { render } from '@testing-library/react-native';
import { MatchLeadersStrip } from '@/src/features/competition/MatchLeadersStrip';
import { MatchFantasyImpactBanner } from '@/src/features/competition/MatchFantasyImpactBanner';
import { PendingFantasyScoreNotice } from '@/src/features/competition/PendingFantasyScoreNotice';
import type { MatchDetails } from '@/src/features/competition/api';

function makeGame(
  id: number,
  matchNumber: number,
  stats: MatchDetails['playerStats'],
  points: MatchDetails['fantasyBreakdown'],
): MatchDetails {
  return {
    match: {
      id,
      series_id: 9,
      status: 'completed',
      scheduled_at: `2026-11-13T${matchNumber + 10}:00:00Z`,
      duration_seconds: 1800,
      gameweek_id: 5,
      match_number: matchNumber,
      best_of: 3,
      radiant_team_id: 10,
      dire_team_id: 20,
      winner_team_id: 10,
      player_ids: stats.map((stat) => stat.player_id),
      radiant_team: { name: 'Team A', tag: 'TA' },
      dire_team: { name: 'Team B', tag: 'TB' },
      tournament: null,
    },
    seriesMatches: [],
    playerStats: stats,
    fantasyBreakdown: points,
  };
}

describe('PendingFantasyScoreNotice', () => {
  it('shows when player stats exist but fantasy points are not calculated', () => {
    const { getByText } = render(
      <PendingFantasyScoreNotice hasPlayerStats hasFantasyBreakdown={false} />,
    );

    expect(getByText('Fantasy points for this match have not been calculated yet. Please check back soon.')).toBeTruthy();
  });

  it('stays hidden when stats are missing or fantasy points are available', () => {
    const { queryByText, rerender } = render(
      <PendingFantasyScoreNotice hasPlayerStats={false} hasFantasyBreakdown={false} />,
    );
    const message = 'Fantasy points for this match have not been calculated yet. Please check back soon.';

    expect(queryByText(message)).toBeNull();

    rerender(<PendingFantasyScoreNotice hasPlayerStats hasFantasyBreakdown />);

    expect(queryByText(message)).toBeNull();
  });
});

describe('MatchLeadersStrip', () => {
  it('renders series leaders with totals and per-game values', () => {
    const { getByText } = render(
      <MatchLeadersStrip
        fantasyMVP={{
          playerId: 101,
          playerName: 'Ame',
          heroName: 'Morphling',
          role: 'Carry',
          value: 48.5,
          formattedValue: '48.5 pts',
          gameValues: [{
            matchId: 1,
            matchNumber: 1,
            scheduledAt: '2026-11-13T10:00:00Z',
            value: 28.5,
            formattedValue: '28.5 pts',
          }],
        }}
        highestDamage={null}
        highestEconomy={null}
        highestKills={null}
      />,
    );

    expect(getByText('Series Leaders')).toBeTruthy();
    expect(getByText('48.5 pts')).toBeTruthy();
    expect(getByText('28.5 pts')).toBeTruthy();
    expect(getByText('Series total')).toBeTruthy();
  });

  it('renders nothing when all leaders are null', () => {
    const { queryByText } = render(
      <MatchLeadersStrip
        fantasyMVP={null}
        highestDamage={null}
        highestEconomy={null}
        highestKills={null}
      />,
    );

    expect(queryByText('Series Leaders')).toBeNull();
  });
});

describe('MatchFantasyImpactBanner', () => {
  it('shows per-game and series captain and bench impact', () => {
    const impact = {
      userOwnedPlayerIds: [101, 102],
      lineupDetails: [
        {
          playerId: 101,
          slot: 'Carry',
          isCaptain: true,
          isViceCaptain: false,
          isStarter: true,
        },
        {
          playerId: 102,
          slot: 'Bench 1',
          isCaptain: false,
          isViceCaptain: false,
          isStarter: false,
        },
      ],
    };
    const gameOne = makeGame(1, 1, [
      {
        id: 1,
        player_id: 101,
        team_id: 10,
        hero_name: 'Morphling',
        kills: 10,
        deaths: 2,
        assists: 8,
        gold_per_minute: 750,
        experience_per_minute: 800,
        hero_damage: 40000,
        player: { id: 101, name: 'Wang Chunyu', in_game_name: 'Ame' },
      },
      {
        id: 2,
        player_id: 102,
        team_id: 10,
        hero_name: 'Storm Spirit',
        kills: 8,
        deaths: 4,
        assists: 12,
        gold_per_minute: 650,
        experience_per_minute: 700,
        hero_damage: 35000,
        player: { id: 102, name: 'Lu Yao', in_game_name: 'Somnus' },
      },
    ], [
      { player_id: 101, total_points: 30 },
      { player_id: 102, total_points: 25 },
    ]);
    const gameTwo = makeGame(2, 2, [{
      id: 3,
      player_id: 101,
      team_id: 20,
      hero_name: 'Morphling',
      kills: 5,
      deaths: 2,
      assists: 10,
      gold_per_minute: 700,
      experience_per_minute: 800,
      hero_damage: 30000,
      player: { id: 101, name: 'Wang Chunyu', in_game_name: 'Ame' },
    }], [{ player_id: 101, total_points: 10 }]);

    const { getAllByText } = render(
      <MatchFantasyImpactBanner impact={impact} games={[gameOne, gameTwo]} />,
    );

    expect(getAllByText('Your Fantasy Impact').length).toBeGreaterThan(0);
    expect(getAllByText('+80.0').length).toBeGreaterThan(0);
    expect(getAllByText('CAPTAIN 2x').length).toBeGreaterThan(0);
    expect(getAllByText('BENCH').length).toBeGreaterThan(0);
    expect(getAllByText(/Game 1 ·/).length).toBeGreaterThan(0);
    expect(getAllByText(/Game 2 ·/).length).toBeGreaterThan(0);
  });

  it('renders the series squad status when owned players did not appear', () => {
    const game = makeGame(1, 1, [{
      id: 1,
      player_id: 101,
      team_id: 10,
      hero_name: 'Morphling',
      kills: 10,
      deaths: 2,
      assists: 8,
      gold_per_minute: 750,
      experience_per_minute: 800,
      hero_damage: 40000,
      player: { id: 101, name: 'Wang Chunyu', in_game_name: 'Ame' },
    }], []);

    const { getByText } = render(
      <MatchFantasyImpactBanner
        impact={{ userOwnedPlayerIds: [999], lineupDetails: [] }}
        games={[game]}
      />,
    );

    expect(getByText('Fantasy Squad Status')).toBeTruthy();
    expect(getByText('None of your fantasy squad players featured in this series.')).toBeTruthy();
  });
});
