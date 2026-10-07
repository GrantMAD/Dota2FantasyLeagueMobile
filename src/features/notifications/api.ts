import { ApiError } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

export type NotificationCategory = 'all' | 'unread' | 'deadline' | 'market' | 'scoring' | 'league';

export interface ManagerNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface NotificationPage {
  notifications: ManagerNotification[];
  unreadCount: number;
}

export type NotificationAction = {
  label: string;
  href:
    | '/team'
    | '/squad-planner'
    | '/gameweeks'
    | '/leagues'
    | { pathname: '/league/[id]'; params: { id: string } }
    | { pathname: '/player/[id]'; params: { id: string } }
    | { pathname: '/match/[id]'; params: { id: string } }
    | { pathname: '/gameweek/[id]'; params: { id: string } }
    | { pathname: '/tournament/[id]'; params: { id: string } };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNotification(value: unknown): ManagerNotification {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.type !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.message !== 'string' ||
    typeof value.is_read !== 'boolean' ||
    typeof value.created_at !== 'string' ||
    !(value.metadata === null || isRecord(value.metadata))
  ) {
    throw new ApiError('Notification data was returned in an unexpected format.', 502);
  }
  return {
    id: Number(value.id),
    type: value.type,
    title: value.title,
    message: value.message,
    is_read: value.is_read,
    created_at: value.created_at,
    metadata: value.metadata,
  };
}

export async function getNotifications(category: NotificationCategory): Promise<NotificationPage> {
  const { data: result, error } = await getSupabaseClient().rpc('mobile_get_notifications', {
    p_category: category,
    p_limit: 100,
  });
  if (error) throw new ApiError(`Unable to load notifications: ${error.message}`, 500);
  if (
    !isRecord(result) ||
    !Array.isArray(result.notifications) ||
    !Number.isInteger(result.unreadCount)
  ) {
    throw new ApiError('Notification data was returned in an unexpected format.', 502);
  }
  return {
    notifications: result.notifications.map(parseNotification),
    unreadCount: Number(result.unreadCount),
  };
}

export async function markNotificationRead(id: number): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mobile_mark_notification_read', {
    p_notification_id: id,
  });
  if (error) throw new ApiError(`Unable to mark notification as read: ${error.message}`, 500);
  if (data !== true) throw new ApiError('Notification not found or does not belong to you.', 404);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mobile_mark_all_notifications_read');
  if (error) throw new ApiError(`Unable to mark notifications as read: ${error.message}`, 500);
  if (data !== true) throw new ApiError('Notifications could not be marked as read.', 502);
}

export async function clearReadNotifications(): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mobile_clear_read_notifications');
  if (error) throw new ApiError(`Unable to clear read notifications: ${error.message}`, 500);
  if (data !== true) throw new ApiError('Read notifications could not be cleared.', 502);
}

export function notificationCategoryForType(type: string): Exclude<NotificationCategory, 'all' | 'unread'> | null {
  switch (type) {
    case 'gameweek_deadline':
    case 'lineup_deadline':
    case 'deadline_reminder':
    case 'deadline':
      return 'deadline';
    case 'price_change':
    case 'transfer_market':
    case 'wildcard_used':
      return 'market';
    case 'score_posted':
    case 'gameweek_result':
    case 'rank_movement':
      return 'scoring';
    case 'league_activity':
    case 'league_result':
    case 'h2h_result':
    case 'league_invite':
      return 'league';
    default:
      return null;
  }
}

function metadataId(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

export function notificationActionFor(notification: ManagerNotification): NotificationAction {
  const matchId = metadataId(notification.metadata, 'match_id');
  if (matchId) {
    return { label: 'View match', href: { pathname: '/match/[id]', params: { id: matchId } } };
  }
  const tournamentId = metadataId(notification.metadata, 'tournament_id');
  if (tournamentId) {
    return {
      label: 'View tournament',
      href: { pathname: '/tournament/[id]', params: { id: tournamentId } },
    };
  }
  const category = notificationCategoryForType(notification.type);
  if (category === 'deadline') return { label: 'Review my squad', href: '/team' };
  if (category === 'market') {
    const playerId = metadataId(notification.metadata, 'player_id');
    return playerId
      ? { label: 'View player', href: { pathname: '/player/[id]', params: { id: playerId } } }
      : { label: 'Open squad planner', href: '/squad-planner' };
  }
  if (category === 'scoring') {
    const gameweekId = metadataId(notification.metadata, 'gameweek_id');
    return gameweekId
      ? { label: 'View gameweek', href: { pathname: '/gameweek/[id]', params: { id: gameweekId } } }
      : { label: 'View gameweeks', href: '/gameweeks' };
  }
  if (category === 'league') {
    const leagueId = metadataId(notification.metadata, 'league_id');
    return leagueId
      ? { label: 'View league', href: { pathname: '/league/[id]', params: { id: leagueId } } }
      : { label: 'Open leagues', href: '/leagues' };
  }
  return { label: 'Open home', href: '/gameweeks' };
}

export function matchesNotificationCategory(
  notification: ManagerNotification,
  category: NotificationCategory
): boolean {
  if (category === 'all') return true;
  if (category === 'unread') return !notification.is_read;
  return notificationCategoryForType(notification.type) === category;
}
