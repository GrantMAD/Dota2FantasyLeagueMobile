import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TransferDeadlineRush,
  formatCountdown,
  getRushBadgeMeta,
} from '../src/features/dashboard/TransferDeadlineRush';
import type { MobileTransferRushData } from '../src/features/dashboard/api';

describe('formatCountdown', () => {
  it('returns 00:00:00 when seconds is zero', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
  });

  it('returns 00:00:00 when seconds is negative', () => {
    expect(formatCountdown(-5)).toBe('00:00:00');
  });

  it('formats sub-minute countdown as HH:MM:SS', () => {
    expect(formatCountdown(45)).toBe('00:00:45');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatCountdown(150)).toBe('00:02:30');
  });

  it('formats hours, minutes, and seconds correctly', () => {
    expect(formatCountdown(3665)).toBe('01:01:05');
  });

  it('uses short day notation for multi-day countdowns', () => {
    // 1 day + 1 hour + 1 minute = 90060s
    expect(formatCountdown(90060)).toBe('1d 1h 1m');
  });
});

describe('getRushBadgeMeta', () => {
  it('returns Lineups Locked badge when isLocked is true', () => {
    const result = getRushBadgeMeta(true, false, false);
    expect(result.label).toBe('Lineups Locked');
    expect(result.badgeContainerStyle).toContain('rose');
  });

  it('returns Rush Active badge when rush is active', () => {
    const result = getRushBadgeMeta(false, true, false);
    expect(result.label).toBe('Rush Active');
    expect(result.badgeContainerStyle).toContain('amber');
  });

  it('returns Deadline Today badge when approaching deadline', () => {
    const result = getRushBadgeMeta(false, false, true);
    expect(result.label).toBe('Deadline Today');
    expect(result.badgeContainerStyle).toContain('sky');
  });

  it('returns Market Open badge when no urgency', () => {
    const result = getRushBadgeMeta(false, false, false);
    expect(result.label).toBe('Market Open');
    expect(result.badgeContainerStyle).toContain('emerald');
  });

  it('locked takes priority over rush active', () => {
    const result = getRushBadgeMeta(true, true, true);
    expect(result.label).toBe('Lineups Locked');
  });
});

describe('TransferDeadlineRush Component', () => {
  const baseData: MobileTransferRushData = {
    gameweek: {
      id: 10,
      gameweek_number: 3,
      deadline: '2026-10-27T18:00:00Z',
      status: 'upcoming',
      is_locked: false,
      seconds_remaining: 3600,
    },
    window_minutes: 60,
    total_transfers_in_window: 42,
    transfers_per_minute: 0.7,
    is_rush_active: true,
    top_transferred_in: [
      {
        id: 101,
        name: 'Artour Babaev',
        in_game_name: 'Arteezy',
        team_name: 'Shopify Rebellion',
        team_logo_url: null,
        role: 'Carry',
        current_price: 7.2,
        transfer_count: 25,
      },
    ],
    top_transferred_out: [
      {
        id: 102,
        name: 'Danil Ishutin',
        in_game_name: 'Dendi',
        team_name: 'B8',
        team_logo_url: null,
        role: 'Mid',
        current_price: 5.5,
        transfer_count: 17,
      },
    ],
    activity_pulses: [
      {
        id: 'pulse-1',
        type: 'milestone',
        message: 'Surging demand: 25 managers brought in Arteezy',
        timestamp: '2026-10-25T19:00:00Z',
        highlight_player_name: 'Arteezy',
      },
    ],
  };

  it('renders off-season state when gameweek is null', () => {
    const data: MobileTransferRushData = { ...baseData, gameweek: null };
    const { getByText } = render(<TransferDeadlineRush data={data} />);
    expect(getByText('Transfer Deadline Rush')).toBeTruthy();
    expect(getByText('Off-Season')).toBeTruthy();
    expect(getByText('Transfer Trends & Market Activity')).toBeTruthy();
  });

  it('renders the header title and gameweek number', () => {
    const { getByText } = render(<TransferDeadlineRush data={baseData} />);
    expect(getByText('Transfer Deadline Rush')).toBeTruthy();
    expect(getByText('GW 3 Deadline & Transfer Trends')).toBeTruthy();
  });

  it('renders Rush Active badge when is_rush_active is true', () => {
    const { getByText } = render(<TransferDeadlineRush data={baseData} />);
    expect(getByText('Rush Active')).toBeTruthy();
  });

  it('renders Market Open badge when no rush and deadline is far away', () => {
    const data: MobileTransferRushData = {
      ...baseData,
      is_rush_active: false,
      gameweek: {
        ...baseData.gameweek!,
        deadline: new Date(Date.now() + 200000 * 1000).toISOString(),
        is_locked: false,
        seconds_remaining: 200000,
      },
    };
    const { getByText } = render(<TransferDeadlineRush data={data} />);
    expect(getByText('Market Open')).toBeTruthy();
  });

  it('renders Lineups Locked badge and LOCKED text when gameweek is locked', () => {
    const data: MobileTransferRushData = {
      ...baseData,
      is_rush_active: false,
      gameweek: { ...baseData.gameweek!, is_locked: true, seconds_remaining: 0 },
    };
    const { getByText } = render(<TransferDeadlineRush data={data} />);
    expect(getByText('Lineups Locked')).toBeTruthy();
    expect(getByText('LOCKED')).toBeTruthy();
  });

  it('renders market pulse message', () => {
    const { getByText } = render(<TransferDeadlineRush data={baseData} />);
    expect(
      getByText(/Surging demand: 25 managers brought in Arteezy/),
    ).toBeTruthy();
  });

  it('shows Top In player by default and hides Top Out player', () => {
    const { getByText, queryByText } = render(<TransferDeadlineRush data={baseData} />);
    expect(getByText('Arteezy')).toBeTruthy();
    expect(queryByText('Dendi')).toBeNull();
  });

  it('switches to Top Out tab and shows out-transferred player', () => {
    const { getByText, queryByText } = render(<TransferDeadlineRush data={baseData} />);
    fireEvent.press(getByText('Top Out'));
    expect(getByText('Dendi')).toBeTruthy();
    expect(queryByText('Arteezy')).toBeNull();
  });

  it('shows positive transfer count on Top In tab', () => {
    const { getByText } = render(<TransferDeadlineRush data={baseData} />);
    expect(getByText('+25')).toBeTruthy();
  });

  it('shows negative transfer count on Top Out tab', () => {
    const { getByText } = render(<TransferDeadlineRush data={baseData} />);
    fireEvent.press(getByText('Top Out'));
    expect(getByText('-17')).toBeTruthy();
  });

  it('shows empty state when no players in active tab', () => {
    const data: MobileTransferRushData = { ...baseData, top_transferred_in: [] };
    const { getByText } = render(<TransferDeadlineRush data={data} />);
    expect(getByText('No transfers recorded yet in this window')).toBeTruthy();
  });
});
