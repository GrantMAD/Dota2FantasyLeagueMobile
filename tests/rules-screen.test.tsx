import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import RulesScreen from '../app/rules';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/src/components/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));

describe('mobile Rules screen', () => {
  it('starts with the main rules expanded and technical details collapsed', () => {
    const screen = render(<RulesScreen />);

    expect(screen.getByRole('button', { name: 'Squad structure rules' }).props.accessibilityState.expanded).toBe(true);
    expect(screen.getByRole('button', { name: 'Under the hood: system mechanics rules' }).props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByText('Automated job schedule')).toBeNull();
  });

  it('toggles a section and lets section shortcuts expand collapsed content', () => {
    const screen = render(<RulesScreen />);
    const squadToggle = screen.getByRole('button', { name: 'Squad structure rules' });

    fireEvent.press(squadToggle);
    expect(screen.getByRole('button', { name: 'Squad structure rules' }).props.accessibilityState.expanded).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: 'Jump to Under the Hood rules' }));
    expect(screen.getByRole('button', { name: 'Under the hood: system mechanics rules' }).props.accessibilityState.expanded).toBe(true);
    expect(screen.getByText('Automated job schedule')).toBeTruthy();
  });
});
