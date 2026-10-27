import {
  getFriendActivity,
  getFriendProgress,
  getFollowing,
  searchFriends,
  setFriendFollow,
} from '../src/features/friends/api';

const mockRpc = jest.fn();
const friendId = '123e4567-e89b-42d3-a456-426614174000';
const profile = {
  id: friendId,
  username: 'tealmanager',
  display_name: 'Teal Manager',
  avatar_url: null,
};

jest.mock('../src/lib/supabase', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

describe('mobile Friends API', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('loads following and manager search through authenticated Supabase RPCs', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{ ...profile, followed_at: '2026-10-27T10:00:00.000Z' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ ...profile, is_following: true }],
        error: null,
      });

    await expect(getFollowing()).resolves.toMatchObject([{ id: friendId, username: 'tealmanager' }]);
    await expect(searchFriends('teal manager')).resolves.toMatchObject([{ id: friendId, is_following: true }]);
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'mobile_get_following');
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'mobile_search_friends', { p_query: 'teal manager' });
  });

  it('follows and unfollows a manager through scoped database RPCs', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(setFriendFollow(friendId, true)).resolves.toBeUndefined();
    await expect(setFriendFollow(friendId, false)).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'mobile_set_friend_follow', {
      p_followed_user_id: friendId,
      p_follow: true,
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'mobile_set_friend_follow', {
      p_followed_user_id: friendId,
      p_follow: false,
    });
  });

  it('parses paginated feed activity and constructs the next database cursor', async () => {
    const row = {
      activity_id: 'audit:00000000000000000001',
      activity_type: 'lineup',
      user_id: friendId,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: null,
      season_id: 7,
      season_name: 'Season 7',
      gameweek_id: 2,
      gameweek_number: 2,
      title: 'Updated lineup',
      players_in: null,
      players_out: null,
      chip: null,
      gameweek_points: null,
      total_points: null,
      gameweek_rank: null,
      previous_gameweek_rank: null,
      global_rank: null,
      updated_at: '2026-10-27T10:00:00.000',
      lineup_changes: [{ slot: 'captain', from: 'Old player', to: 'New player' }],
    };
    mockRpc.mockResolvedValueOnce({
      data: Array.from({ length: 21 }, (_, index) => ({
        ...row,
        activity_id: `audit:${String(index + 1).padStart(20, '0')}`,
      })),
      error: null,
    });

    const page = await getFriendActivity();
    expect(page.activities).toHaveLength(20);
    expect(page.activities[0]).toMatchObject({
      activity_type: 'lineup',
      lineup_changes: [{ slot: 'captain', from: 'Old player', to: 'New player' }],
    });
    expect(page.nextCursor).toBe('2026-10-27T10:00:00.000~audit:00000000000000000020');
    expect(mockRpc).toHaveBeenCalledWith('mobile_get_friends_feed', {
      p_before: null,
      p_before_id: null,
      p_limit: 21,
    });
  });

  it('passes a decoded cursor to the database RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getFriendActivity('2026-10-27T10:00:00.000~score:00000000000000000020'))
      .resolves.toEqual({ activities: [], nextCursor: null });
    expect(mockRpc).toHaveBeenCalledWith('mobile_get_friends_feed', {
      p_before: '2026-10-27T10:00:00.000',
      p_before_id: 'score:00000000000000000020',
      p_limit: 21,
    });
  });

  it('loads followed manager progress and surfaces database authorization errors', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: {
          manager: profile,
          season: {
            id: 7,
            name: 'Season 7',
            total_points: 82,
            global_rank: 4,
            gameweeks: [{
              id: 10,
              gameweek_number: 2,
              gameweek_points: '35',
              total_points: '82',
              rank: 4,
              updated_at: '2026-10-27T10:00:00.000Z',
            }],
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Follow this manager to view their progress.', code: 'P0001' },
      });

    await expect(getFriendProgress(friendId)).resolves.toMatchObject({
      season: { total_points: 82, gameweeks: [{ gameweek_points: 35, rank: 4 }] },
    });
    await expect(getFriendProgress(friendId)).rejects.toThrow('Follow this manager to view their progress.');
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'mobile_get_friend_progress', {
      p_followed_user_id: friendId,
    });
  });
});
