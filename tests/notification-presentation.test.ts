import type { ManagerNotification } from '../src/features/notifications/api';
import { groupNotificationsByDay } from '../src/features/notifications/presentation';

function notification(id: number, createdAt: Date | string): ManagerNotification {
  return {
    id,
    type: 'gameweek_result',
    title: `Notification ${id}`,
    message: 'Test notification',
    is_read: false,
    created_at: typeof createdAt === 'string' ? createdAt : createdAt.toISOString(),
    metadata: null,
  };
}

describe('groupNotificationsByDay', () => {
  it('groups notifications by the viewer local dates', () => {
    const now = new Date(2026, 9, 15, 12);
    const groups = groupNotificationsByDay([
      notification(1, new Date(2026, 9, 15, 10)),
      notification(2, new Date(2026, 9, 14, 10)),
      notification(3, new Date(2026, 9, 12, 10)),
      notification(4, new Date(2026, 9, 11, 10)),
      notification(5, 'invalid'),
    ], now);

    expect(groups.map(({ label, notifications }) => [label, notifications.map(({ id }) => id)])).toEqual([
      ['Today', [1]],
      ['Yesterday', [2]],
      ['This week', [3]],
      ['Earlier', [4, 5]],
    ]);
  });

  it('combines notifications from separate loaded pages into one date group', () => {
    const now = new Date(2026, 9, 15, 12);
    const groups = groupNotificationsByDay([
      notification(1, new Date(2026, 9, 15, 10)),
      notification(2, new Date(2026, 9, 15, 9)),
    ], now);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].notifications.map(({ id }) => id)).toEqual([1, 2]);
  });
});
