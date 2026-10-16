import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MatchLeadersStrip } from '@/src/features/competition/MatchLeadersStrip';
import { MatchFantasyImpactBanner } from '@/src/features/competition/MatchFantasyImpactBanner';

describe('MatchLeadersStrip', () => {
  it('renders all four leaders when available', () => {
    const { getByText } = render(
      <MatchLeadersStrip
        fantasyMVP={{
          playerId: 101,
          playerName: 'Ame',
          heroName: 'Morphling',
          role: 'Carry',
          value: 48.5,
          formattedValue: '48.5 pts',
        }}
        highestDamage={{
          playerId: 102,
          playerName: 'Somnus',
          heroName: 'Storm Spirit',
          role: 'Mid',
          value: 52000,
          formattedValue: '52,000',
        }}
        highestGPM={{
          playerId: 101,
          playerName: 'Ame',
          heroName: 'Morphling',
          role: 'Carry',
          value: 840,
          formattedValue: '840 GPM',
        }}
        highestKills={{
          playerId: 103,
          playerName: 'XinQ',
          heroName: 'Rubick',
          role: 'Support',
          value: 14,
          formattedValue: '14 kills',
        }}
      />
    );

    expect(getByText('Match Leaders')).toBeTruthy();
    expect(getByText('48.5 pts')).toBeTruthy();
    expect(getByText('52,000')).toBeTruthy();
    expect(getByText('840 GPM')).toBeTruthy();
    expect(getByText('14 kills')).toBeTruthy();
  });

  it('renders nothing when all leaders are null', () => {
    const { queryByText } = render(
      <MatchLeadersStrip
        fantasyMVP={null}
        highestDamage={null}
        highestGPM={null}
        highestKills={null}
      />
    );

    expect(queryByText('Match Leaders')).toBeNull();
  });
});

describe('MatchFantasyImpactBanner', () => {
  it('renders banner when user has players in the match', () => {
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

    const playerStats = [
      {
        id: 1,
        player_id: 101,
        team_id: 5,
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
        team_id: 5,
        hero_name: 'Storm Spirit',
        kills: 8,
        deaths: 4,
        assists: 12,
        gold_per_minute: 650,
        experience_per_minute: 700,
        hero_damage: 35000,
        player: { id: 102, name: 'Lu Yao', in_game_name: 'Somnus' },
      },
    ];

    const fantasyPoints = new Map([
      [101, 30.0],
      [102, 25.0],
    ]);

    const { getByText } = render(
      <MatchFantasyImpactBanner
        impact={impact}
        playerStats={playerStats}
        fantasyPointsByPlayer={fantasyPoints}
        gameweekId={5}
      />
    );

    expect(getByText('Your Fantasy Impact')).toBeTruthy();
    // Ame is captain (30 * 2 = 60), Somnus is bench (25 * 0 = 0) -> +60.0
    expect(getByText('+60.0')).toBeTruthy();
    expect(getByText('CAPTAIN 2x')).toBeTruthy();
    expect(getByText('BENCH')).toBeTruthy();
  });

  it('renders status fallback when user has squad but none in this match', () => {
    const impact = {
      userOwnedPlayerIds: [999],
      lineupDetails: [],
    };

    const playerStats = [
      {
        id: 1,
        player_id: 101,
        team_id: 5,
        hero_name: 'Morphling',
        kills: 10,
        deaths: 2,
        assists: 8,
        gold_per_minute: 750,
        experience_per_minute: 800,
        hero_damage: 40000,
        player: { id: 101, name: 'Wang Chunyu', in_game_name: 'Ame' },
      },
    ];

    const { getByText } = render(
      <MatchFantasyImpactBanner
        impact={impact}
        playerStats={playerStats}
        fantasyPointsByPlayer={new Map()}
        gameweekId={5}
      />
    );

    expect(getByText('Fantasy Squad Status')).toBeTruthy();
  });
});
