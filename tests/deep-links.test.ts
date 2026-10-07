import { managerReturnRoute } from '../src/lib/deep-links';

describe('manager deep-link routing', () => {
  it.each([
    '/(tabs)',
    '/(tabs)/discover',
    '/matches',
    '/season-recap',
    '/notifications',
  ])('preserves the supported static destination %s', (path) => {
    expect(managerReturnRoute(path)).toBe(path);
  });

  it.each([
    ['/player/42', { pathname: '/player/[id]', params: { id: '42' } }],
    ['/match/17', { pathname: '/match/[id]', params: { id: '17' } }],
    ['/tournament/8', { pathname: '/tournament/[id]', params: { id: '8' } }],
    ['/gameweek/3', { pathname: '/gameweek/[id]', params: { id: '3' } }],
    ['/league/29', { pathname: '/league/[id]', params: { id: '29' } }],
  ])('preserves the valid internal target %s', (path, expected) => {
    expect(managerReturnRoute(path)).toEqual(expected);
  });

  it.each([
    undefined,
    '',
    '//example.com',
    '/player/1?redirect=https://example.com',
    '/player/../admin',
    '/unknown/1',
    '/player/0',
  ])('uses Home for an unsafe or unsupported return target', (path) => {
    expect(managerReturnRoute(path)).toBe('/(tabs)');
  });
});
