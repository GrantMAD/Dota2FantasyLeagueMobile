import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { FantasyContext } from './api';
import { activateChip } from './api';
import { useMobileTheme } from '@/src/lib/theme';

interface ChipActivationPanelProps {
  context: FantasyContext;
  userId: string;
}

export function ChipActivationPanel({ context, userId }: ChipActivationPanelProps) {
  const queryClient = useQueryClient();
  const { theme } = useMobileTheme();
  const isDark = theme === 'dark';
  const [actionError, setActionError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: activateChip,
    onSuccess: async (result) => {
      setActionError(null);
      Alert.alert('Chip activated', result.message);
      await queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Chip activation failed. Please try again.');
    },
  });

  function confirmActivation(chip: 'triple-captain' | 'bench-boost', label: string) {
    if (!context.fantasySeasonId || context.gameweek?.isLocked || mutation.isPending) return;
    const fantasySeasonId = context.fantasySeasonId;
    Alert.alert(
      `Activate ${label}?`,
      'This action cannot be undone. The server will check whether the chip can be used in this gameweek.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate chip',
          style: 'destructive',
          onPress: () => {
            setActionError(null);
            mutation.mutate({ fantasySeasonId, chip });
          },
        },
      ]
    );
  }

  return (
    <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
          <SymbolView
            name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }}
            size={20}
            tintColor={isDark ? '#fbbf24' : '#b45309'}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-slate-50">Gameweek chips</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-400">
            Chip eligibility is checked by the server for the selected gameweek.
          </Text>
        </View>
      </View>
      <ChipRow
        label="Triple Captain"
        tone="amber"
        isDark={isDark}
        used={context.chips.tripleCaptainUsed}
        usedGameweekNumber={context.availableGameweeks.find(
          (gameweek) => gameweek.id === context.chips.tripleCaptainGameweekId
        )?.gameweekNumber ?? null}
        busy={mutation.isPending}
        locked={context.gameweek?.isLocked ?? true}
        onActivate={() => confirmActivation('triple-captain', 'Triple Captain')}
      />
      <ChipRow
        label="Bench Boost"
        tone="cyan"
        isDark={isDark}
        used={context.chips.benchBoostUsed}
        usedGameweekNumber={context.availableGameweeks.find(
          (gameweek) => gameweek.id === context.chips.benchBoostGameweekId
        )?.gameweekNumber ?? null}
        busy={mutation.isPending}
        locked={context.gameweek?.isLocked ?? true}
        onActivate={() => confirmActivation('bench-boost', 'Bench Boost')}
      />
      {actionError ? (
        <Text accessibilityRole="alert" className="text-sm leading-5 text-red-300">{actionError}</Text>
      ) : null}
    </View>
  );
}

function ChipRow({
  label,
  tone,
  isDark,
  used,
  usedGameweekNumber,
  busy,
  locked,
  onActivate,
}: {
  label: string;
  tone: 'amber' | 'cyan';
  isDark: boolean;
  used: boolean;
  usedGameweekNumber: number | null;
  busy: boolean;
  locked: boolean;
  onActivate: () => void;
}) {
  const disabled = used || busy || locked;
  const toneClasses = tone === 'amber'
    ? 'border-amber-700/50 bg-amber-950/25'
    : 'border-cyan-700/50 bg-cyan-950/25';
  const iconTint = tone === 'amber'
    ? isDark ? '#fbbf24' : '#b45309'
    : isDark ? '#22d3ee' : '#0e7490';
  return (
    <View className={`flex-row items-center justify-between gap-3 rounded-xl border p-3 ${toneClasses}`}>
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-950/50">
        <SymbolView
          name={tone === 'amber'
            ? { ios: 'star.fill', android: 'star', web: 'star' }
            : { ios: 'person.3.fill', android: 'groups', web: 'groups' }}
          size={17}
          tintColor={iconTint}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-slate-50">{label}</Text>
        <Text className={`mt-1 text-xs ${used ? 'text-slate-400' : 'text-emerald-300'}`}>
          {used
            ? usedGameweekNumber === null
              ? 'Already used this season'
              : `Used in Gameweek ${usedGameweekNumber}`
            : locked
              ? 'Unavailable while the gameweek is locked'
              : 'Available'}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator accessibilityLabel={`Activating ${label}`} color="#14b8a6" />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          className={`min-h-11 min-w-20 items-center justify-center rounded-lg border border-slate-700 px-3 ${
            disabled ? 'opacity-50' : 'active:bg-slate-800'
          }`}
          disabled={disabled}
          onPress={onActivate}
        >
          <Text className="text-xs font-semibold text-slate-50">{used ? 'Used' : 'Activate'}</Text>
        </Pressable>
      )}
    </View>
  );
}
