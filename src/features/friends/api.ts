import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVITY_TYPES = ['transfer', 'chip', 'lineup', 'gameweek_score'] as const;
const FEED_PAGE_SIZE = 20;
type FriendActivityType = typeof ACTIVITY_TYPES[number];

export interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  followed_at?: string;
  is_following?: boolean;
}

export interface FriendActivity {
  activity_id: string;
  activity_type: FriendActivityType;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  season_id: number;
  season_name: string;
  gameweek_id: number | null;
  gameweek_number: number | null;
  title: string;
  players_in: string[] | null;
  players_out: string[] | null;
  chip: string | null;
  gameweek_points: number | null;
  total_points: number | null;
  gameweek_rank: number | null;
  previous_gameweek_rank: number | null;
  global_rank: number | null;
  updated_at: string;
  lineup_changes: {
    slot: string;
    from: string | null;
    to: string | null;
  }[];
}

export interface FriendActivityPage {
  activities: FriendActivity[];
  nextCursor: string | null;
}

export interface FriendProgress {
  manager: FriendProfile;
  season: {
    id: number;
    name: string;
    total_points: number;
    global_rank: number | null;
    gameweeks: {
      id: number;
      gameweek_number: number;
      gameweek_points: number;
      total_points: number;
      rank: number;
      updated_at: string;
    }[];
  } | null;
}

interface FeedCursor {
  updatedAt: string;
  activityId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (
    (typeof value === 'number' || typeof value === 'string') &&
    Number.isFinite(Number(value))
  );
}

function toNumber(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || !Number.isFinite(Number(value))) {
    throw new ApiError('Friend data was returned in an unexpected format.', 502);
  }
  return Number(value);
}

function toNullableNumber(value: unknown): number | null {
  return value === null ? null : toNumber(value);
}

function parseProfile(value: unknown): FriendProfile {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !USER_ID_PATTERN.test(value.id) ||
    typeof value.username !== 'string' ||
    !isNullableString(value.display_name) ||
    !isNullableString(value.avatar_url)
  ) {
    throw new ApiError('Friend profile data was returned in an unexpected format.', 502);
  }
  return {
    id: value.id,
    username: value.username,
    display_name: value.display_name,
    avatar_url: value.avatar_url,
    ...(typeof value.followed_at === 'string' ? { followed_at: value.followed_at } : {}),
    ...(typeof value.is_following === 'boolean' ? { is_following: value.is_following } : {}),
  };
}

function parseStringArray(value: unknown): string[] | null {
  if (value === null) return null;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new ApiError('Friend activity data was returned in an unexpected format.', 502);
  }
  return value;
}

function parseActivity(value: unknown): FriendActivity {
  if (
    !isRecord(value) ||
    typeof value.activity_id !== 'string' ||
    !ACTIVITY_TYPES.includes(value.activity_type as FriendActivityType) ||
    typeof value.user_id !== 'string' ||
    typeof value.username !== 'string' ||
    !isNullableString(value.display_name) ||
    !isNullableString(value.avatar_url) ||
    !isNullableNumber(value.season_id) ||
    value.season_id === null ||
    typeof value.season_name !== 'string' ||
    !isNullableNumber(value.gameweek_id) ||
    !isNullableNumber(value.gameweek_number) ||
    typeof value.title !== 'string' ||
    !isNullableString(value.chip) ||
    !isNullableNumber(value.gameweek_points) ||
    !isNullableNumber(value.total_points) ||
    !isNullableNumber(value.gameweek_rank) ||
    !isNullableNumber(value.previous_gameweek_rank) ||
    !isNullableNumber(value.global_rank) ||
    typeof value.updated_at !== 'string' ||
    !(value.lineup_changes === null || Array.isArray(value.lineup_changes))
  ) {
    throw new ApiError('Friend activity data was returned in an unexpected format.', 502);
  }

  const lineupChanges = (value.lineup_changes ?? []).map((change) => {
    if (
      !isRecord(change) ||
      typeof change.slot !== 'string' ||
      !isNullableString(change.from) ||
      !isNullableString(change.to)
    ) {
      throw new ApiError('Lineup change data was returned in an unexpected format.', 502);
    }
    return { slot: change.slot, from: change.from, to: change.to };
  });

  return {
    activity_id: value.activity_id,
    activity_type: value.activity_type as FriendActivityType,
    user_id: value.user_id,
    username: value.username,
    display_name: value.display_name,
    avatar_url: value.avatar_url,
    season_id: toNumber(value.season_id),
    season_name: value.season_name,
    gameweek_id: toNullableNumber(value.gameweek_id),
    gameweek_number: toNullableNumber(value.gameweek_number),
    title: value.title,
    players_in: parseStringArray(value.players_in),
    players_out: parseStringArray(value.players_out),
    chip: value.chip,
    gameweek_points: toNullableNumber(value.gameweek_points),
    total_points: toNullableNumber(value.total_points),
    gameweek_rank: toNullableNumber(value.gameweek_rank),
    previous_gameweek_rank: toNullableNumber(value.previous_gameweek_rank),
    global_rank: toNullableNumber(value.global_rank),
    updated_at: value.updated_at,
    lineup_changes: lineupChanges,
  };
}

function parseProgress(value: unknown): FriendProgress {
  if (!isRecord(value) || !('season' in value) || (value.season !== null && !isRecord(value.season))) {
    throw new ApiError('Manager progress data was returned in an unexpected format.', 502);
  }
  const manager = parseProfile(value.manager);
  if (value.season === null) return { manager, season: null };
  if (
    !isRecord(value.season) ||
    !isNullableNumber(value.season.id) ||
    value.season.id === null ||
    typeof value.season.name !== 'string' ||
    !isNullableNumber(value.season.total_points) ||
    value.season.total_points === null ||
    !isNullableNumber(value.season.global_rank) ||
    !Array.isArray(value.season.gameweeks)
  ) {
    throw new ApiError('Manager progress data was returned in an unexpected format.', 502);
  }

  const gameweeks = value.season.gameweeks.map((gameweek) => {
    if (
      !isRecord(gameweek) ||
      !isNullableNumber(gameweek.id) ||
      gameweek.id === null ||
      !isNullableNumber(gameweek.gameweek_number) ||
      gameweek.gameweek_number === null ||
      !isNullableNumber(gameweek.gameweek_points) ||
      gameweek.gameweek_points === null ||
      !isNullableNumber(gameweek.total_points) ||
      gameweek.total_points === null ||
      !isNullableNumber(gameweek.rank) ||
      gameweek.rank === null ||
      typeof gameweek.updated_at !== 'string'
    ) {
      throw new ApiError('Manager gameweek history was returned in an unexpected format.', 502);
    }
    return {
      id: toNumber(gameweek.id),
      gameweek_number: toNumber(gameweek.gameweek_number),
      gameweek_points: toNumber(gameweek.gameweek_points),
      total_points: toNumber(gameweek.total_points),
      rank: toNumber(gameweek.rank),
      updated_at: gameweek.updated_at,
    };
  });

  return {
    manager,
    season: {
      id: toNumber(value.season.id),
      name: value.season.name,
      total_points: toNumber(value.season.total_points),
      global_rank: toNullableNumber(value.season.global_rank),
      gameweeks,
    },
  };
}

function parseCursor(cursor: string | null | undefined): FeedCursor | null {
  if (!cursor) return null;
  const separatorIndex = cursor.lastIndexOf('~');
  if (separatorIndex < 1) throw new ApiError('The activity feed cursor is invalid.', 400);
  const updatedAt = cursor.slice(0, separatorIndex);
  const activityId = cursor.slice(separatorIndex + 1);
  if (
    Number.isNaN(Date.parse(updatedAt)) ||
    !/^(audit|score):\d{20}$/.test(activityId)
  ) {
    throw new ApiError('The activity feed cursor is invalid.', 400);
  }
  return { updatedAt, activityId };
}

function throwRpcError(message: string, error: { message: string; code?: string } | null): void {
  if (error) {
    throw new ApiError(`${message}: ${error.message}`, error.code === 'PGRST301' ? 401 : 500);
  }
}

export async function getFollowing(): Promise<FriendProfile[]> {
  const { data, error } = await getSupabaseClient().rpc('mobile_get_following');
  throwRpcError('Unable to load followed managers', error);
  if (!Array.isArray(data)) throw new ApiError('Following list was returned in an unexpected format.', 502);
  return data.map(parseProfile);
}

export async function searchFriends(query: string): Promise<FriendProfile[]> {
  const { data, error } = await getSupabaseClient().rpc('mobile_search_friends', {
    p_query: query.trim(),
  });
  throwRpcError('Unable to search managers', error);
  if (!Array.isArray(data)) throw new ApiError('Friend search was returned in an unexpected format.', 502);
  return data.map(parseProfile);
}

export async function getFriendActivity(cursor?: string | null): Promise<FriendActivityPage> {
  const parsedCursor = parseCursor(cursor);
  const { data, error } = await getSupabaseClient().rpc('mobile_get_friends_feed', {
    p_before: parsedCursor?.updatedAt ?? null,
    p_before_id: parsedCursor?.activityId ?? null,
    p_limit: FEED_PAGE_SIZE + 1,
  });
  throwRpcError('Unable to load friends activity', error);
  if (!Array.isArray(data)) throw new ApiError('Friend activity was returned in an unexpected format.', 502);

  const rows = data.map(parseActivity);
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const activities = rows.slice(0, FEED_PAGE_SIZE);
  const lastActivity = activities.at(-1);
  return {
    activities,
    nextCursor: hasMore && lastActivity
      ? `${lastActivity.updated_at}~${lastActivity.activity_id}`
      : null,
  };
}

export async function setFriendFollow(userId: string, follow: boolean): Promise<void> {
  if (!USER_ID_PATTERN.test(userId)) throw new ApiError('A valid manager is required.', 400);
  const { error } = await getSupabaseClient().rpc('mobile_set_friend_follow', {
    p_followed_user_id: userId,
    p_follow: follow,
  });
  throwRpcError(follow ? 'Unable to follow this manager' : 'Unable to unfollow this manager', error);
}

export async function getFriendProgress(userId: string): Promise<FriendProgress> {
  if (!USER_ID_PATTERN.test(userId)) throw new ApiError('A valid manager is required.', 400);
  const { data, error } = await getSupabaseClient().rpc('mobile_get_friend_progress', {
    p_followed_user_id: userId,
  });
  throwRpcError('Unable to load manager progress', error);
  return parseProgress(data);
}
