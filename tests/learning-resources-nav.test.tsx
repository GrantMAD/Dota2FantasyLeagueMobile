import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { LearningResourcesNav } from '../src/components/LearningResourcesNav';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../src/lib/theme', () => ({
  useMobileTheme: () => ({ theme: 'dark', colors: { onAccent: '#ffffff' } }),
}));

describe('LearningResourcesNav', () => {
  it.each([
    ['learn', 'Learn Hub'],
    ['guide', 'Interactive Guide'],
    ['help', 'Help Center'],
  ] as const)('explains all destinations and marks %s as current', (currentPage, currentLabel) => {
    const screen = render(<LearningResourcesNav currentPage={currentPage} />);

    expect(screen.getByText('Learning and support')).toBeTruthy();
    expect(screen.getByText('Follow a curated path through fantasy basics and key actions.')).toBeTruthy();
    expect(screen.getByText('Launch a walkthrough for a specific screen or feature.')).toBeTruthy();
    expect(screen.getByText('Find FAQ answers, support guidance, or report an issue.')).toBeTruthy();
    expect(screen.getByLabelText(`${currentLabel}, current page`)).toBeTruthy();
    expect(screen.getAllByText('Current page')).toHaveLength(1);
  });
});
