import type { DashboardTournamentEvent, DashboardUpdate } from './api';
import type { FriendActivity } from '@/src/features/friends/api';

export type MobileWhatsNewCategory =
  | 'friend'
  | 'availability'
  | 'live_match'
  | 'price_change'
  | 'tournament';

export type MobileFeedItemChild =
  | { type: 'friend'; data: FriendActivity }
  | { type: 'update'; data: DashboardUpdate }
  | { type: 'tournament'; data: DashboardTournamentEvent };

export interface MobileFeedGroupItem {
  type: 'group';
  category: MobileWhatsNewCategory;
  count: number;
  label: string;
  title: string;
  preview: string;
  items: MobileFeedItemChild[];
}

export type MobileFeedItem = MobileFeedItemChild | MobileFeedGroupItem;

export function groupMobileWhatsNewItems(
  friendActivities: FriendActivity[],
  dashboardUpdates: DashboardUpdate[],
  tournaments: DashboardTournamentEvent[],
  tab: 'all' | 'friends' | 'squad' | 'tournaments',
): MobileFeedItem[] {
  if (tab === 'friends') {
    return friendActivities.map((f) => ({ type: 'friend', data: f }));
  }

  if (tab === 'tournaments') {
    return tournaments.map((t) => ({ type: 'tournament', data: t }));
  }

  const priceChanges = dashboardUpdates.filter((u) => u.kind === 'price_change');
  const availabilityUpdates = dashboardUpdates.filter((u) => u.kind === 'availability');
  const matchLifecycleUpdates = dashboardUpdates.filter(
    (u) => u.kind !== 'price_change' && u.kind !== 'availability',
  );

  const result: MobileFeedItem[] = [];

  const addCategory = <T extends MobileFeedItemChild>(
    category: MobileWhatsNewCategory,
    items: T[],
    titleGenerator: (count: number, first: T) => { title: string; preview: string },
    label: string,
  ) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      result.push(items[0]);
    } else {
      const { title, preview } = titleGenerator(items.length, items[0]);
      result.push({
        type: 'group',
        category,
        count: items.length,
        label,
        title,
        preview,
        items,
      });
    }
  };

  if (tab === 'all') {
    addCategory(
      'friend',
      friendActivities.map((f) => ({ type: 'friend' as const, data: f })),
      (count, first) => {
        const f = first.data;
        const name = f.display_name?.trim() || f.username;
        return {
          title: `${count} Friend Moves`,
          preview: `Latest: ${name} · ${f.title}`,
        };
      },
      'Friend Activity',
    );

    addCategory(
      'availability',
      availabilityUpdates.map((u) => ({ type: 'update' as const, data: u })),
      (count, first) => ({
        title: `${count} Squad Alerts`,
        preview: `Latest: ${first.data.title}`,
      }),
      'Squad Availability',
    );

    addCategory(
      'live_match',
      matchLifecycleUpdates.map((u) => ({ type: 'update' as const, data: u })),
      (count, first) => ({
        title: `${count} Match Alerts`,
        preview: `Latest: ${first.data.title}`,
      }),
      'Match Alerts',
    );

    addCategory(
      'price_change',
      priceChanges.map((u) => ({ type: 'update' as const, data: u })),
      (count, first) => ({
        title: `${count} Price Changes`,
        preview: `Latest: ${first.data.title} (${first.data.message})`,
      }),
      'Price Changes',
    );

    addCategory(
      'tournament',
      tournaments.map((t) => ({ type: 'tournament' as const, data: t })),
      (count, first) => ({
        title: `${count} Active Tournaments`,
        preview: `Latest: ${first.data.title}`,
      }),
      'Tournaments',
    );
  } else if (tab === 'squad') {
    addCategory(
      'availability',
      availabilityUpdates.map((u) => ({ type: 'update' as const, data: u })),
      (count, first) => ({
        title: `${count} Squad Alerts`,
        preview: `Latest: ${first.data.title}`,
      }),
      'Squad Availability',
    );

    addCategory(
      'live_match',
      matchLifecycleUpdates.map((u) => ({ type: 'update' as const, data: u })),
      (count, first) => ({
        title: `${count} Match Alerts`,
        preview: `Latest: ${first.data.title}`,
      }),
      'Match Alerts',
    );

    addCategory(
      'price_change',
      priceChanges.map((u) => ({ type: 'update' as const, data: u })),
      (count, first) => ({
        title: `${count} Price Changes`,
        preview: `Latest: ${first.data.title} (${first.data.message})`,
      }),
      'Price Changes',
    );
  }

  return result;
}

export function getMobileCategoryTheme(category: MobileWhatsNewCategory, isDark: boolean) {
  switch (category) {
    case 'friend':
      return {
        label: 'Friend Activity',
        singleLabel: 'Friend Move',
        itemNoun: 'friend moves',
        borderColor: '#14b8a6',
        tintColor: '#2dd4bf',
        labelColor: '#5eead4',
        bg: isDark ? 'rgba(20, 184, 166, 0.08)' : 'rgba(13, 148, 136, 0.07)',
        expandedBg: isDark ? 'rgba(20, 184, 166, 0.14)' : 'rgba(13, 148, 136, 0.12)',
        guideColor: 'rgba(20, 184, 166, 0.35)',
        pillBg: 'rgba(20, 184, 166, 0.20)',
        pillText: '#2dd4bf',
        icon: { ios: 'person.2.fill', android: 'group', web: 'group' } as const,
      };
    case 'availability':
      return {
        label: 'Squad Alerts',
        singleLabel: 'Squad Availability',
        itemNoun: 'availability alerts',
        borderColor: '#f43f5e',
        tintColor: '#fb7185',
        labelColor: '#fda4af',
        bg: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(225, 29, 72, 0.06)',
        expandedBg: isDark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(225, 29, 72, 0.10)',
        guideColor: 'rgba(244, 63, 94, 0.35)',
        pillBg: 'rgba(244, 63, 94, 0.20)',
        pillText: '#fb7185',
        icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as const,
      };
    case 'live_match':
      return {
        label: 'Match Alerts',
        singleLabel: 'Match Alert',
        itemNoun: 'match alerts',
        borderColor: '#06b6d4',
        tintColor: '#22d3ee',
        labelColor: '#67e8f9',
        bg: isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(8, 145, 178, 0.06)',
        expandedBg: isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(8, 145, 178, 0.10)',
        guideColor: 'rgba(6, 182, 212, 0.35)',
        pillBg: 'rgba(6, 182, 212, 0.20)',
        pillText: '#22d3ee',
        icon: { ios: 'dot.radiowaves.left.and.right', android: 'radio', web: 'radio' } as const,
      };
    case 'price_change':
      return {
        label: 'Price Changes',
        singleLabel: 'Player Price',
        itemNoun: 'price changes',
        borderColor: '#10b981',
        tintColor: '#34d399',
        labelColor: '#6ee7b7',
        bg: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(5, 150, 105, 0.06)',
        expandedBg: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(5, 150, 105, 0.10)',
        guideColor: 'rgba(16, 185, 129, 0.35)',
        pillBg: 'rgba(16, 185, 129, 0.20)',
        pillText: '#34d399',
        icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' } as const,
      };
    case 'tournament':
      return {
        label: 'Active Tournaments',
        singleLabel: 'Tournament Active',
        itemNoun: 'active tournaments',
        borderColor: '#f59e0b',
        tintColor: '#fbbf24',
        labelColor: '#fcd34d',
        bg: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.06)',
        expandedBg: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(217, 119, 6, 0.10)',
        guideColor: 'rgba(245, 158, 11, 0.35)',
        pillBg: 'rgba(245, 158, 11, 0.20)',
        pillText: '#fbbf24',
        icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' } as const,
      };
  }
}
