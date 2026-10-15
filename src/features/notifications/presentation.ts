import type { ManagerNotification } from './api';

export interface NotificationGroup {
  label: string;
  notifications: ManagerNotification[];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function groupNotificationsByDay(
  notifications: ManagerNotification[],
  now = new Date()
): NotificationGroup[] {
  const today = startOfLocalDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = startOfLocalWeek(now);
  const groups = new Map<string, ManagerNotification[]>();

  for (const notification of notifications) {
    const createdAt = new Date(notification.created_at);
    const notificationDay = Number.isNaN(createdAt.getTime()) ? null : startOfLocalDay(createdAt);
    let label = 'Earlier';

    if (notificationDay && notificationDay.getTime() === today.getTime()) {
      label = 'Today';
    } else if (notificationDay && notificationDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else if (
      notificationDay &&
      notificationDay.getTime() >= weekStart.getTime() &&
      notificationDay.getTime() < yesterday.getTime()
    ) {
      label = 'This week';
    }

    const group = groups.get(label);
    if (group) group.push(notification);
    else groups.set(label, [notification]);
  }

  return [...groups].map(([label, groupedNotifications]) => ({
    label,
    notifications: groupedNotifications,
  }));
}
