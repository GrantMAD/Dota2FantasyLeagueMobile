import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import type { FantasyContext } from './api';
import { activateWildcard } from './api';

interface WildcardPanelProps {
  context: FantasyContext;
  userId: string;
}

export function WildcardPanel({ context, userId }: WildcardPanelProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: activateWildcard,
    onSuccess: async (result) => {
      Alert.alert('Wildcard activated', result.message);
      await queryClient.invalidateQueries({ queryKey: ['fantasy-context', userId] });
    },
  });
  const wildcardActive = Boolean(
    context.chips.wildcardUsed &&
    context.gameweek &&
    context.chips.wildcardUsedGameweekId === context.gameweek.id
  );
  const unavailable = context.chips.wildcardUsed && !wildcardActive;
  const canActivate = Boolean(
    context.fantasySeasonId &&
    !context.chips.wildcardUsed &&
    context.gameweek &&
    !context.gameweek.isLocked &&
    !mutation.isPending
  );

  function confirmActivation() {
    if (!canActivate || !context.fantasySeasonId) return;
    const fantasySeasonId = context.fantasySeasonId;
    Alert.alert(
      'Activate Wildcard?',
      'This uses your once-per-season Wildcard for the current eligible gameweek and enables multiple transfers without transfer-hit penalties. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Wildcard',
          style: 'destructive',
          onPress: () => mutation.mutate({ fantasySeasonId }),
        },
      ]
    );
  }

  return (
    <View className="gap-3 rounded-2xl border border-amber-800/70 bg-amber-950/30 p-4">
      <View>
        <Text className="text-base font-semibold text-amber-200">Wildcard</Text>
        <Text className="mt-1 text-sm leading-5 text-amber-100/80">
          {wildcardActive
            ? 'Active for this gameweek. Use the multi-transfer builder below before the deadline.'
            : unavailable
              ? 'Already used this season.'
              : context.gameweek?.isLocked
                ? 'Unavailable while the gameweek is locked.'
                : 'Available once this season. Activation is immediate and cannot be undone.'}
        </Text>
      </View>
      {mutation.isError ? (
        <Text accessibilityRole="alert" className="text-sm text-red-300">
          {mutation.error instanceof Error ? mutation.error.message : 'Wildcard activation failed.'}
        </Text>
      ) : null}
      {wildcardActive || unavailable ? (
        <Text className={`text-xs font-semibold uppercase tracking-wider ${wildcardActive ? 'text-emerald-300' : 'text-slate-400'}`}>
          {wildcardActive ? 'Active' : 'Used'}
        </Text>
      ) : mutation.isPending ? (
        <ActivityIndicator accessibilityLabel="Activating Wildcard" color="#fbbf24" />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canActivate }}
          className={`min-h-11 items-center justify-center rounded-xl border border-amber-500/50 px-4 ${
            canActivate ? 'bg-amber-500/20 active:bg-amber-500/30' : 'bg-slate-800 opacity-50'
          }`}
          disabled={!canActivate}
          onPress={confirmActivation}
        >
          <Text className="font-semibold text-amber-100">Activate Wildcard</Text>
        </Pressable>
      )}
    </View>
  );
}
