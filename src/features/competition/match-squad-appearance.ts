import type { FantasyPlayer } from '@/src/features/fantasy/api';
import type { MatchSummary } from './api';

export type MatchSquadAppearance =
  | { kind: 'confirmed'; playerNames: string[] }
  | { kind: 'unconfirmed'; playerNames: [] }
  | { kind: 'none'; playerNames: [] };

export function getMatchSquadAppearance(
  match: MatchSummary,
  ownedPlayers: FantasyPlayer[],
): MatchSquadAppearance {
  const ownedById = new Map(ownedPlayers.map((player) => [player.id, player]));
  if (match.player_ids.length > 0) {
    const playerNames = match.player_ids.flatMap((id) => {
      const player = ownedById.get(id);
      return player ? [player.in_game_name?.trim() || player.name] : [];
    });
    return playerNames.length > 0
      ? { kind: 'confirmed', playerNames }
      : { kind: 'none', playerNames: [] };
  }

  const ownedTeamIds = new Set(
    ownedPlayers.flatMap((player) =>
      player.professional_teams ? [player.professional_teams.id] : [],
    ),
  );
  const hasSquadTeamFixture =
    (match.radiant_team_id !== null && ownedTeamIds.has(match.radiant_team_id)) ||
    (match.dire_team_id !== null && ownedTeamIds.has(match.dire_team_id));
  return hasSquadTeamFixture
    ? { kind: 'unconfirmed', playerNames: [] }
    : { kind: 'none', playerNames: [] };
}
