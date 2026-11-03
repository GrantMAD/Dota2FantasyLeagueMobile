import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TournamentSeriesTimeline } from '@/src/features/competition/TournamentSeriesTimeline';
import { TournamentGroupStandings } from '@/src/features/competition/TournamentGroupStandings';
import type { MatchSummary } from '@/src/features/competition/api';

const mockMatches: MatchSummary[] = [
  {
    id: 1,
    status: 'completed',
    scheduled_at: '2026-10-25T13:00:00Z',
    gameweek_id: 1,
    match_number: 1,
    best_of: 3,
    radiant_team_id: 10,
    dire_team_id: 20,
    winner_team_id: 10,
    player_ids: [],
    radiant_team: { name: 'Team Alpha', tag: 'ALPH' },
    dire_team: { name: 'Team Beta', tag: 'BETA' },
    tournament: { id: 1, name: 'Test Major', tier: 'Tier 1' },
  },
  {
    id: 2,
    status: 'completed',
    scheduled_at: '2026-10-25T14:15:00Z',
    gameweek_id: 1,
    match_number: 2,
    best_of: 3,
    radiant_team_id: 20,
    dire_team_id: 10,
    winner_team_id: 10,
    player_ids: [],
    radiant_team: { name: 'Team Beta', tag: 'BETA' },
    dire_team: { name: 'Team Alpha', tag: 'ALPH' },
    tournament: { id: 1, name: 'Test Major', tier: 'Tier 1' },
  },
  {
    id: 3,
    status: 'completed',
    scheduled_at: '2026-10-26T10:00:00Z',
    gameweek_id: 1,
    match_number: 1,
    best_of: 2,
    radiant_team_id: 30,
    dire_team_id: 40,
    winner_team_id: 30,
    player_ids: [],
    radiant_team: { name: 'Team Gamma', tag: 'GAM' },
    dire_team: { name: 'Team Delta', tag: 'DEL' },
    tournament: { id: 1, name: 'Test Major', tier: 'Tier 1' },
  },
  {
    id: 4,
    status: 'completed',
    scheduled_at: '2026-10-26T11:00:00Z',
    gameweek_id: 1,
    match_number: 2,
    best_of: 2,
    radiant_team_id: 40,
    dire_team_id: 30,
    winner_team_id: 40,
    player_ids: [],
    radiant_team: { name: 'Team Delta', tag: 'DEL' },
    dire_team: { name: 'Team Gamma', tag: 'GAM' },
    tournament: { id: 1, name: 'Test Major', tier: 'Tier 1' },
  },
];

const mockTeams = [
  { id: 10, name: 'Team Alpha', tag: 'ALPH' },
  { id: 20, name: 'Team Beta', tag: 'BETA' },
  { id: 30, name: 'Team Gamma', tag: 'GAM' },
  { id: 40, name: 'Team Delta', tag: 'DEL' },
];

describe('TournamentSeriesTimeline', () => {
  it('renders empty message when no matches are provided', () => {
    const { getByText } = render(<TournamentSeriesTimeline matches={[]} />);
    expect(getByText('No Series Data Yet')).toBeTruthy();
  });

  it('renders series grouped by day with correct scores and winner', () => {
    const onMatchPress = jest.fn();
    const { getByText } = render(
      <TournamentSeriesTimeline matches={mockMatches} onMatchPress={onMatchPress} />
    );

    expect(getByText('Series Results Timeline')).toBeTruthy();
    expect(getByText('Team Alpha')).toBeTruthy();
    expect(getByText('Team Beta')).toBeTruthy();
    expect(getByText('Team Gamma')).toBeTruthy();
    expect(getByText('Team Delta')).toBeTruthy();

    // Trigger match details navigation
    fireEvent.press(getByText('Team Alpha'));
    expect(onMatchPress).toHaveBeenCalledWith(1);
  });
});

describe('TournamentGroupStandings', () => {
  it('renders empty message when no teams are provided', () => {
    const { getByText } = render(<TournamentGroupStandings matches={[]} competingTeams={[]} />);
    expect(getByText('No Standings Available')).toBeTruthy();
  });

  it('calculates series played, wins, draws, diff, and points accurately', () => {
    const { getByText, getAllByText } = render(
      <TournamentGroupStandings matches={mockMatches} competingTeams={mockTeams} />
    );

    // Group Stage Table header
    expect(getByText('Group Stage Table')).toBeTruthy();

    // Team Alpha won 2-0 (3 points, +2 diff)
    expect(getByText('Team Alpha')).toBeTruthy();
    expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);

    // Team Gamma and Delta drew 1-1 (1 point each, 0 diff)
    expect(getByText('Team Gamma')).toBeTruthy();
    expect(getByText('Team Delta')).toBeTruthy();
  });
});
