import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import type { FantasyContext } from './api';
import { activateChip } from './api';

interface ChipActivationPanelProps {
  context: FantasyContext;
  userId: string;
}

export function ChipActivationPanel({ context, userId }: ChipActivationPanelProps) {
  const queryClient = useQueryClient();
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
      <View>
        <Text className="text-base font-semibold text-white">Gameweek chips</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-400">
          Chip eligibility is checked by the server for the selected gameweek.
        </Text>
      </View>
      <ChipRow
        label="Triple Captain"
        used={context.chips.tripleCaptainUsed}
        busy={mutation.isPending}
        locked={context.gameweek?.isLocked ?? true}
        onActivate={() => confirmActivation('triple-captain', 'Triple Captain')}
      />
      <ChipRow
        label="Bench Boost"
        used={context.chips.benchBoostUsed}
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
  used,
  busy,
  locked,
  onActivate,
}: {
  label: string;
  used: boolean;
  busy: boolean;
  locked: boolean;
  onActivate: () => void;
}) {
  const disabled = used || busy || locked;
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl bg-slate-950 p-3">
      <View className="flex-1">
        <Text className="font-semibold text-white">{label}</Text>
        <Text className={`mt-1 text-xs ${used ? 'text-slate-400' : 'text-emerald-300'}`}>
          {used ? 'Already used this season' : locked ? 'Unavailable while the gameweek is locked' : 'Available'}
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
          <Text className="text-xs font-semibold text-white">{used ? 'Used' : 'Activate'}</Text>
        </Pressable>
      )}
    </View>
  );
}
