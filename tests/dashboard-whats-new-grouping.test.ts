import {
  groupMobileWhatsNewItems,
  getMobileCategoryTheme,
} from '../src/features/dashboard/whats-new-grouping';
import type { DashboardTournamentEvent, DashboardUpdate } from '../src/features/dashboard/api';
import type { FriendActivity } from '../src/features/friends/api';

function friend(id: number, username = `user${id}`): FriendActivity {
  return {
    activity_id: `transfer:${id}`,
    activity_type: 'transfer',
    user_id: `u-${id}`,
    username,
    display_name: null,
    avatar_url: null,
    season_id: 1,
    season_name: 'Season',
    gameweek_id: 6,
    gameweek_number: 6,
    title: 'Made fantasy transfers',
    players_in: ['Miracle-'],
    players_out: ['Ame'],
    chip: null,
    gameweek_points: null,
    total_points: 100,
    gameweek_rank: null,
    previous_gameweek_rank: null,
    global_rank: null,
    updated_at: '2026-11-20T12:00:00Z',
    lineup_changes: [],
  };
}

function update(id: number, kind: DashboardUpdate['kind'], title = `Update ${id}`, message = `Msg ${id}`): DashboardUpdate {
  if (kind === 'price_change' || kind === 'availability') {
    return {
      id,
      kind,
      playerId: 100 + id,
      title,
      message,
      createdAt: '2026-11-20T12:00:00Z',
    };
  }
  return {
    id,
    kind,
    matchId: 200 + id,
    title,
    message,
    createdAt: '2026-11-20T12:00:00Z',
  };
}

function tournament(id: number, title = `Tournament ${id}`): DashboardTournamentEvent {
  return {
    id,
    title,
    startedAt: '2026-11-20T00:00:00Z',
    tier: 'Tier 1',
    seriesCount: 2,
    matchCount: 4,
    bestOfFormats: [3],
  };
}

describe('groupMobileWhatsNewItems', () => {
  it('leaves single items ungrouped as individual items', () => {
    const friends = [friend(1)];
    const updates = [update(2, 'price_change', 'Miracle- Up')];
    const tourneys = [tournament(3, 'BLAST SLAM IX')];

    const result = groupMobileWhatsNewItems(friends, updates, tourneys, 'all');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'friend', data: friends[0] });
    expect(result[1]).toEqual({ type: 'update', data: updates[0] });
    expect(result[2]).toEqual({ type: 'tournament', data: tourneys[0] });
  });

  it('groups multiple price changes into an accordion group', () => {
    const updates = [
      update(1, 'price_change', 'Miracle- Up', '+$0.2M'),
      update(2, 'price_change', 'Ame Up', '+$0.1M'),
      update(3, 'price_change', 'Yatoro Down', '-$0.1M'),
    ];

    const result = groupMobileWhatsNewItems([], updates, [], 'all');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('group');
    if (result[0].type === 'group') {
      expect(result[0].category).toBe('price_change');
      expect(result[0].count).toBe(3);
      expect(result[0].title).toBe('3 Price Changes');
      expect(result[0].preview).toContain('Miracle- Up');
      expect(result[0].items).toHaveLength(3);
    }
  });

  it('groups multiple friend moves and multiple tournaments separately', () => {
    const friends = [friend(1, 'alice'), friend(2, 'bob')];
    const tourneys = [tournament(10, 'BLAST'), tournament(11, 'DreamLeague')];

    const result = groupMobileWhatsNewItems(friends, [], tourneys, 'all');
    expect(result).toHaveLength(2);

    expect(result[0].type).toBe('group');
    if (result[0].type === 'group') {
      expect(result[0].category).toBe('friend');
      expect(result[0].count).toBe(2);
    }

    expect(result[1].type).toBe('group');
    if (result[1].type === 'group') {
      expect(result[1].category).toBe('tournament');
      expect(result[1].count).toBe(2);
    }
  });

  it('groups squad updates in squad tab while filtering out friends and tournaments', () => {
    const friends = [friend(1), friend(2)];
    const updates = [
      update(1, 'availability', 'Miracle- Doubtful'),
      update(2, 'price_change', 'Ame Up'),
      update(3, 'price_change', 'Yatoro Up'),
    ];
    const tourneys = [tournament(10)];

    const result = groupMobileWhatsNewItems(friends, updates, tourneys, 'squad');
    expect(result).toHaveLength(2);

    // Availability single item
    expect(result[0].type).toBe('update');

    // Price changes group
    expect(result[1].type).toBe('group');
    if (result[1].type === 'group') {
      expect(result[1].category).toBe('price_change');
      expect(result[1].count).toBe(2);
    }
  });

  it('shows individual items directly when filtering by friends or tournaments', () => {
    const friends = [friend(1), friend(2), friend(3)];
    const tourneys = [tournament(10), tournament(11)];

    const friendsResult = groupMobileWhatsNewItems(friends, [], tourneys, 'friends');
    expect(friendsResult).toHaveLength(3);
    expect(friendsResult.every((r) => r.type === 'friend')).toBe(true);

    const tourneysResult = groupMobileWhatsNewItems(friends, [], tourneys, 'tournaments');
    expect(tourneysResult).toHaveLength(2);
    expect(tourneysResult.every((r) => r.type === 'tournament')).toBe(true);
  });
});

describe('getMobileCategoryTheme', () => {
  it('returns valid themes for both dark and light modes', () => {
    const darkTheme = getMobileCategoryTheme('price_change', true);
    const lightTheme = getMobileCategoryTheme('price_change', false);

    expect(darkTheme.label).toBe('Price Changes');
    expect(darkTheme.borderColor).toBe('#10b981');
    expect(darkTheme.bg).toContain('0.08');
    expect(lightTheme.bg).toContain('0.06');
  });
});
