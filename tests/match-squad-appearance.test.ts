import { getMatchSquadAppearance } from '@/src/features/competition/match-squad-appearance';
import type { MatchSummary } from '@/src/features/competition/api';
import type { FantasyPlayer } from '@/src/features/fantasy/api';

const match: MatchSummary = {
  id: 1,
  status: 'live',
  scheduled_at: '2026-10-17T14:00:00Z',
  gameweek_id: 2,
  match_number: 1,
  best_of: 3,
  radiant_team_id: 10,
  dire_team_id: 20,
  player_ids: [101, 202],
  radiant_team: { name: 'Team A', tag: 'TA' },
  dire_team: { name: 'Team B', tag: 'TB' },
  tournament: null,
};

const ownedPlayer: FantasyPlayer = {
  id: 101,
  name: 'Player One',
  in_game_name: 'One',
  primary_role: 'carry',
  profile_image_url: null,
  professional_teams: { id: 10, name: 'Team A', slug: null },
  availability_status: null,
  availability_reason: null,
  current_price: 10,
  last_gw_points: 0,
  recent_points: 0,
};

describe('getMatchSquadAppearance', () => {
  it('confirms owned players by player ID when match statistics are available', () => {
    expect(getMatchSquadAppearance(match, [ownedPlayer])).toEqual({
      kind: 'confirmed',
      playerNames: ['One'],
    });
  });

  it('does not infer an owned player appearance from team membership when stats show other participants', () => {
    expect(getMatchSquadAppearance(match, [{
      ...ownedPlayer,
      id: 303,
    }])).toEqual({ kind: 'none', playerNames: [] });
  });

  it('marks a matching team fixture unconfirmed when participant statistics are absent', () => {
    expect(getMatchSquadAppearance({ ...match, player_ids: [] }, [ownedPlayer])).toEqual({
      kind: 'unconfirmed',
      playerNames: [],
    });
  });
});
