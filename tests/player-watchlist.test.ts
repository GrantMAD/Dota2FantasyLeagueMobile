const mockGetSession = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

let playerApi: typeof import('../src/features/players/api');

describe('mobile player watchlist API', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../src/lib/supabase', () => ({
      getSupabaseClient: () => ({
        auth: { getSession: mockGetSession },
        from: mockFrom,
        rpc: mockRpc,
      }),
    }));
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'manager-1' } } },
      error: null,
    });
    mockFrom.mockReset();
    mockRpc.mockReset();
    playerApi = jest.requireActual<typeof import('../src/features/players/api')>(
      '../src/features/players/api',
    );
  });

  it('loads the signed-in managers watchlist and parses player details', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{
        player_id: 17,
      }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });
    mockRpc.mockResolvedValue({
      data: {
        player: {
          id: 17,
          name: 'Player Name',
          in_game_name: 'PlayerTag',
          primary_role: 'Carry',
          availability_status: 'available',
          profile_image_url: null,
          professional_teams: { name: 'Radiant' },
          current_price: 5,
          gameweek_points: 0,
          recent_points: 0,
          ownership_percentage: 0,
          total_season_points: 0,
          last_gw_points: 0,
          performances: [],
        },
      },
      error: null,
    });

    await expect(playerApi.getPlayerWatchlist()).resolves.toEqual([{
      id: 17,
      name: 'Player Name',
      in_game_name: 'PlayerTag',
      primary_role: 'Carry',
      availability_status: 'available',
      team_name: 'Radiant',
      profile_image_url: null,
    }]);
    expect(mockFrom).toHaveBeenCalledWith('player_watchlist');
    expect(select).toHaveBeenCalledWith('player_id');
    expect(eq).toHaveBeenCalledWith('user_id', 'manager-1');
    expect(mockRpc).toHaveBeenCalledWith('mobile_get_player_detail', { p_player_id: 17 });
  });

  it('upserts and removes only the signed-in managers selected player', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    await expect(playerApi.setPlayerWatchlisted(17, true)).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'manager-1', player_id: 17 },
      { onConflict: 'user_id,player_id', ignoreDuplicates: true },
    );

    const playerFilter = jest.fn().mockResolvedValue({ error: null });
    const userFilter = jest.fn().mockReturnValue({ eq: playerFilter });
    const remove = jest.fn().mockReturnValue({ eq: userFilter });
    mockFrom.mockReturnValue({ delete: remove });

    await expect(playerApi.setPlayerWatchlisted(17, false)).resolves.toBeUndefined();
    expect(userFilter).toHaveBeenCalledWith('user_id', 'manager-1');
    expect(playerFilter).toHaveBeenCalledWith('player_id', 17);
  });

  it('rejects invalid player IDs before writing', async () => {
    await expect(playerApi.setPlayerWatchlisted(0, true)).rejects.toMatchObject({
      message: 'A valid player ID is required.',
      status: 400,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
