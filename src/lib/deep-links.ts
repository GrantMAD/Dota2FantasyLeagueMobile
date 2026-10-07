import type { Href } from 'expo-router';

const staticRoutes: Record<string, Href> = {
  '/(tabs)': '/(tabs)',
  '/(tabs)/discover': '/(tabs)/discover',
  '/(tabs)/leagues': '/(tabs)/leagues',
  '/(tabs)/more': '/(tabs)/more',
  '/(tabs)/team': '/(tabs)/team',
  '/analytics': '/analytics',
  '/compare-players': '/compare-players',
  '/gameweeks': '/gameweeks',
  '/leaderboard': '/leaderboard',
  '/learn': '/learn',
  '/leagues': '/leagues',
  '/matches': '/matches',
  '/notifications': '/notifications',
  '/profile': '/profile',
  '/rules': '/rules',
  '/season-recap': '/season-recap',
  '/squad-planner': '/squad-planner',
  '/team': '/team',
  '/tournaments': '/tournaments',
};

export function managerReturnRoute(value: string | string[] | undefined): Href {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || path.includes('?') || path.includes('#') || path.includes('\\')) return '/(tabs)';
  const staticRoute = staticRoutes[path];
  if (staticRoute) return staticRoute;

  const match = path.match(/^\/(player|match|tournament|gameweek|league)\/([1-9]\d*)$/);
  if (!match) return '/(tabs)';

  const [, resource, id] = match;
  if (resource === 'player') return { pathname: '/player/[id]', params: { id } };
  if (resource === 'match') return { pathname: '/match/[id]', params: { id } };
  if (resource === 'tournament') return { pathname: '/tournament/[id]', params: { id } };
  if (resource === 'gameweek') return { pathname: '/gameweek/[id]', params: { id } };
  return { pathname: '/league/[id]', params: { id } };
}
