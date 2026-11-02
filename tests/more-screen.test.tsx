import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import MoreScreen from '@/app/(tabs)/more';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/src/components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/src/components/ScreenScrollView', () => ({
  ScreenScrollView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/src/lib/auth', () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock('@/src/lib/theme', () => ({
  useMobileTheme: () => ({ theme: 'dark', colors: { onAccent: '#ffffff' } }),
}));

describe('More navigation hub', () => {
  it('groups secondary destinations and exposes direct Help and Premium routes', () => {
    const screen = render(<MoreScreen />);

    for (const section of [
      'Planning',
      'Community',
      'Competition & Esports',
      'Insights',
      'Learning & Support',
      'Account',
    ]) {
      expect(screen.getByText(section)).toBeTruthy();
    }

    for (const destination of [
      'Friends',
      'Gameweeks',
      'Squad Planner',
      'Global Leaderboard',
      'Analytics',
      'Season Recap',
      'Notifications',
      'Learn & Rules',
      'Help',
      'Report an issue',
      'Premium',
      'Profile & Settings',
      'Sign out',
    ]) {
      expect(screen.getByText(destination)).toBeTruthy();
    }
  });
});
