import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CompareSelectionBar, parseDiscoverRole } from '../app/(tabs)/discover';

jest.mock('@/src/components/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/src/components/DataFreshnessBadge', () => ({
  DataFreshnessBadge: () => null,
}));

jest.mock('@/src/lib/theme', () => ({
  useMobileTheme: () => ({ colors: { placeholder: '#94a3b8' }, theme: 'dark' }),
}));

jest.mock('@/src/features/fantasy/hooks', () => ({
  useFantasyContext: () => ({ data: undefined }),
}));

describe('Discover comparison selection', () => {
  it('normalizes valid role search parameters and ignores unknown roles', () => {
    expect(parseDiscoverRole('mid')).toBe('Mid');
    expect(parseDiscoverRole(['Hard Support', 'Carry'])).toBe('Hard Support');
    expect(parseDiscoverRole('captain')).toBe('');
    expect(parseDiscoverRole(undefined)).toBe('');
  });

  it('keeps clear and compare actions available in the selection bar', () => {
    const onClear = jest.fn();
    const onCompare = jest.fn();
    const view = render(
      <CompareSelectionBar selectedCount={2} onClear={onClear} onCompare={onCompare} />,
    );

    expect(view.getByText('2 players selected')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Clear comparison selection' }));
    fireEvent.press(view.getByRole('button', { name: 'Compare 2 players' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  it('disables comparison until at least two players are selected', () => {
    const onCompare = jest.fn();
    const view = render(
      <CompareSelectionBar selectedCount={1} onClear={jest.fn()} onCompare={onCompare} />,
    );
    const compareButton = view.getByRole('button', { name: 'Compare 1 player' });

    expect(compareButton.props.accessibilityState.disabled).toBe(true);
    expect(view.getByText('Select one more player to compare.')).toBeTruthy();
    fireEvent.press(compareButton);
    expect(onCompare).not.toHaveBeenCalled();
  });
});
