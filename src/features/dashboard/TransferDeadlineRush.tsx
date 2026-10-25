import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type {
  MobileTransferRushData,
  MobileTransferRushPlayer,
} from '@/src/features/dashboard/api';

export function formatCountdown(totalSec: number): string {
  if (totalSec <= 0) return '00:00:00';
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function getRushBadgeMeta(
  isLocked: boolean,
  isRushActive: boolean,
  isApproaching: boolean,
): {
  label: string;
  badgeContainerStyle: string;
  badgeTextStyle: string;
} {
  if (isLocked) {
    return {
      label: 'Lineups Locked',
      badgeContainerStyle: 'border-rose-500/40 bg-rose-500/15',
      badgeTextStyle: 'text-rose-400',
    };
  }
  if (isRushActive) {
    return {
      label: 'Rush Active',
      badgeContainerStyle: 'border-amber-500/50 bg-amber-500/20',
      badgeTextStyle: 'text-amber-300',
    };
  }
  if (isApproaching) {
    return {
      label: 'Deadline Today',
      badgeContainerStyle: 'border-sky-500/40 bg-sky-500/15',
      badgeTextStyle: 'text-sky-300',
    };
  }
  return {
    label: 'Market Open',
    badgeContainerStyle: 'border-emerald-500/40 bg-emerald-500/15',
    badgeTextStyle: 'text-emerald-400',
  };
}

interface TransferDeadlineRushProps {
  data: MobileTransferRushData | null | undefined;
}

export function TransferDeadlineRush({ data }: TransferDeadlineRushProps) {
  const gameweek = data?.gameweek ?? null;
  const top_transferred_in = data?.top_transferred_in ?? [];
  const top_transferred_out = data?.top_transferred_out ?? [];
  const activity_pulses = data?.activity_pulses ?? [];
  const is_rush_active = data?.is_rush_active ?? false;
  const total_transfers_in_window = data?.total_transfers_in_window ?? 0;

  // Derive an absolute deadline timestamp so we can compute remaining seconds
  // from Date.now() inside the interval callback only — the linter disallows
  // any synchronous setState call in an effect body.
  const deadlineMs = gameweek?.deadline ? new Date(gameweek.deadline).getTime() : null;

  const [timeRemaining, setTimeRemaining] = useState<number>(() =>
    deadlineMs ? Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000)) : 0
  );
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');

  useEffect(() => {
    // All setState calls must be inside the callback, never in the effect body.
    if (!deadlineMs) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadlineMs]);

  // Derive display value at render time so it is always fresh even before the
  // first interval tick fires (e.g. after a data refresh or on initial mount).
  const displayTimeRemaining = deadlineMs
    ? Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000))
    : timeRemaining;

  if (!data) {
    return null;
  }

  const isLocked = gameweek ? gameweek.is_locked || displayTimeRemaining <= 0 : false;
  const isApproaching = gameweek ? !isLocked && displayTimeRemaining < 24 * 3600 : false;
  const {
    label: badgeLabel,
    badgeContainerStyle,
    badgeTextStyle,
  } = gameweek
    ? getRushBadgeMeta(isLocked, is_rush_active, isApproaching)
    : { label: 'Off-Season', badgeContainerStyle: 'border-slate-700 bg-slate-800/60', badgeTextStyle: 'text-slate-300' };

  const displayedPlayers = activeTab === 'in' ? top_transferred_in : top_transferred_out;

  return (
    <View
      accessibilityLabel="Transfer deadline rush widget"
      className={`gap-3.5 rounded-2xl border p-4 ${
        is_rush_active
          ? 'border-amber-500/40 bg-amber-950/20'
          : 'border-slate-800 bg-slate-900/90'
      }`}
    >
      {/* Header with Title and Status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl ${
              is_rush_active ? 'bg-amber-500/20' : 'bg-teal-500/15'
            }`}
          >
            <SymbolView
              name={
                is_rush_active
                  ? { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }
                  : { ios: 'bolt.fill', android: 'bolt', web: 'bolt' }
              }
              size={18}
              tintColor={is_rush_active ? '#fbbf24' : '#2dd4bf'}
            />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-white">Transfer Deadline Rush</Text>
              <View className={`rounded-full border px-2 py-0.5 ${badgeContainerStyle}`}>
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${badgeTextStyle}`}>
                  {badgeLabel}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-slate-400">
              {gameweek
                ? `GW ${gameweek.gameweek_number} Deadline & Transfer Trends`
                : 'Transfer Trends & Market Activity'}
            </Text>
          </View>
        </View>

        <Link href="/team" asChild>
          <Pressable accessibilityRole="button" className="min-h-10 justify-center px-1">
            <Text className="text-xs font-semibold text-teal-300">Transfers ›</Text>
          </Pressable>
        </Link>
      </View>

      {/* Countdown Timer Strip */}
      {gameweek ? (
        <View className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={
                isLocked
                  ? { ios: 'lock.fill', android: 'lock', web: 'lock' }
                  : { ios: 'clock.fill', android: 'schedule', web: 'schedule' }
              }
              size={15}
              tintColor={isLocked ? '#fb7185' : is_rush_active ? '#fbbf24' : '#2dd4bf'}
            />
            <Text className="text-xs font-medium text-slate-300">
              {isLocked ? 'Lineups Locked for GW ' + gameweek.gameweek_number : 'Deadline Closes In'}
            </Text>
          </View>
          <Text
            className={`font-mono text-sm font-bold ${
              isLocked
                ? 'text-rose-400'
                : is_rush_active
                ? 'text-amber-300'
                : 'text-white'
            }`}
          >
            {isLocked ? 'LOCKED' : formatCountdown(displayTimeRemaining)}
          </Text>
        </View>
      ) : null}

      {/* Market Pulse Banner */}
      {activity_pulses.length > 0 && (
        <View className="flex-row items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
          <SymbolView
            name={{ ios: 'waveform.path.ecg', android: 'insights', web: 'insights' }}
            size={14}
            tintColor="#2dd4bf"
          />
          <Text className="flex-1 text-xs text-slate-300" numberOfLines={1}>
            <Text className="font-semibold text-slate-200">Market Pulse: </Text>
            {activity_pulses[0].message}
          </Text>
          {total_transfers_in_window > 0 && (
            <View className="rounded-md bg-slate-800/80 px-1.5 py-0.5">
              <Text className="text-[10px] font-semibold text-slate-400">
                {total_transfers_in_window} moves/hr
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Top Movers Switcher Tabs */}
      <View className="flex-row items-center justify-between pt-1">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Top Movers (Past Hour)
        </Text>
        <View className="flex-row rounded-lg border border-slate-800 bg-slate-950/60 p-0.5">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'in' }}
            onPress={() => setActiveTab('in')}
            className={`rounded-md px-2.5 py-1 ${
              activeTab === 'in' ? 'bg-emerald-500/20' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'in' ? 'text-emerald-300' : 'text-slate-400'
              }`}
            >
              Top In
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'out' }}
            onPress={() => setActiveTab('out')}
            className={`rounded-md px-2.5 py-1 ${
              activeTab === 'out' ? 'bg-rose-500/20' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'out' ? 'text-rose-300' : 'text-slate-400'
              }`}
            >
              Top Out
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Player List */}
      {displayedPlayers.length === 0 ? (
        <View className="items-center py-4">
          <Text className="text-xs text-slate-400">
            No transfers recorded yet in this window
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {displayedPlayers.map((player: MobileTransferRushPlayer, index: number) => (
            <Link key={player.id} href={`/player/${player.id}`} asChild>
              <Pressable className="flex-row items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/30 p-2.5 active:bg-slate-800/50">
                <View className="flex-row items-center gap-2.5">
                  <Text className="font-mono text-xs font-bold text-slate-400">
                    #{index + 1}
                  </Text>
                  {player.team_logo_url ? (
                    <Image
                      source={{ uri: player.team_logo_url }}
                      className="h-5 w-5 rounded-full"
                    />
                  ) : (
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-slate-800">
                      <Text className="text-[10px] text-slate-400">
                        {player.team_name ? player.team_name[0] : '•'}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text className="text-xs font-semibold text-white">
                      {player.in_game_name || player.name}
                    </Text>
                    <Text className="text-[11px] text-slate-400">
                      {player.team_name || 'Free Agent'} • {player.role || 'Player'}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'in' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {activeTab === 'in' ? `+${player.transfer_count}` : `-${player.transfer_count}`}
                  </Text>
                  <Text className="text-[10px] text-slate-400">
                    ${Number(player.current_price).toFixed(1)}M
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}
