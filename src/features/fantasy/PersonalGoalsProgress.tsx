import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGoals } from './api';

interface PersonalGoalsProgressProps {
  totalPoints: number;
  globalRank: number | null;
  targetPoints?: number | null;
  targetRank?: number | null;
}

const POINTS_PRESETS = [300, 500, 750, 1000];
const RANK_PRESETS = [50, 100, 500, 1000];

export function PersonalGoalsProgress({
  totalPoints,
  globalRank,
  targetPoints,
  targetRank,
}: PersonalGoalsProgressProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pointsInput, setPointsInput] = useState('');
  const [rankInput, setRankInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (variables: { targetPoints?: number | null; targetRank?: number | null }) =>
      updateGoals(variables),
    onSuccess: (data) => {
      // Invalidate both fantasy context and fantasy lineup context queries
      void queryClient.invalidateQueries({ queryKey: ['fantasy-context'] });
      void queryClient.invalidateQueries({ queryKey: ['fantasy-lineup-context'] });
      setIsModalOpen(false);
      setValidationError(null);
    },
    onError: (err: unknown) => {
      setValidationError(err instanceof Error ? err.message : 'Failed to save goals.');
    },
  });

  const openModal = () => {
    setPointsInput(targetPoints !== null && targetPoints !== undefined ? String(targetPoints) : '');
    setRankInput(targetRank !== null && targetRank !== undefined ? String(targetRank) : '');
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    setValidationError(null);

    let parsedPoints: number | null = null;
    if (pointsInput.trim() !== '') {
      parsedPoints = parseFloat(pointsInput.trim());
      if (isNaN(parsedPoints) || parsedPoints <= 0 || parsedPoints > 100000) {
        setValidationError('Points goal must be a positive number up to 100,000.');
        return;
      }
    }

    let parsedRank: number | null = null;
    if (rankInput.trim() !== '') {
      parsedRank = parseInt(rankInput.trim(), 10);
      if (isNaN(parsedRank) || parsedRank < 1 || parsedRank > 10000000) {
        setValidationError('Rank goal must be a positive number of 1 or greater.');
        return;
      }
    }

    mutation.mutate({
      targetPoints: parsedPoints,
      targetRank: parsedRank,
    });
  };

  const hasGoals = Boolean(
    (targetPoints !== null && targetPoints !== undefined && targetPoints > 0) ||
    (targetRank !== null && targetRank !== undefined && targetRank > 0)
  );

  // Calculations
  const pointsTarget = targetPoints && targetPoints > 0 ? targetPoints : null;
  const pointsPercent = pointsTarget
    ? Math.min(Math.round((totalPoints / pointsTarget) * 100), 100)
    : 0;
  const pointsRemaining = pointsTarget ? Math.max(0, Math.round((pointsTarget - totalPoints) * 10) / 10) : 0;
  const pointsAchieved = pointsTarget !== null && totalPoints >= pointsTarget;

  const rankTarget = targetRank && targetRank > 0 ? targetRank : null;
  const rankAchieved = rankTarget !== null && globalRank !== null && globalRank <= rankTarget;
  const rankDistance = rankTarget !== null && globalRank !== null ? globalRank - rankTarget : null;

  return (
    <>
      <View
        accessibilityLabel="Personal Goals section"
        className="gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/15">
              <SymbolView
                name={{ ios: 'target', android: 'gps_fixed', web: 'gps_fixed' }}
                size={18}
                tintColor="#67e8f9"
              />
            </View>
            <View>
              <Text className="text-base font-bold text-white">Season Milestones</Text>
              <Text className="text-xs text-slate-400">Track and beat your seasonal targets</Text>
            </View>
          </View>

        </View>

        {!hasGoals ? (
          /* Empty / Unset State */
          <View className="items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 p-4">
            <Text className="text-center text-sm font-medium text-slate-300">
              No personal milestones set for this season yet.
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              Set target points or a leaderboard rank to stay motivated and track your progress.
            </Text>
          </View>
        ) : (
          /* Goals Display State */
          <View className="gap-3.5">
            {/* Points Goal Row */}
            {pointsTarget !== null ? (
              <View className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-3.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <SymbolView
                      name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                      size={15}
                      tintColor="#38bdf8"
                    />
                    <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">Points Target</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    {pointsAchieved ? (
                      <View className="flex-row items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5">
                        <SymbolView
                          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                          size={11}
                          tintColor="#34d399"
                        />
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Achieved</Text>
                      </View>
                    ) : (
                      <Text className="text-xs font-semibold text-cyan-300">{pointsPercent}%</Text>
                    )}
                  </View>
                </View>

                {/* Numbers */}
                <View className="mt-2 flex-row items-baseline justify-between">
                  <Text className="text-lg font-extrabold text-white">
                    {totalPoints.toLocaleString()}{' '}
                    <Text className="text-xs font-medium text-slate-400">/ {pointsTarget.toLocaleString()} pts</Text>
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {pointsAchieved
                      ? 'Goal reached! 🎉'
                      : `${pointsRemaining.toLocaleString()} pts left`}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <View
                    className={`h-full rounded-full ${pointsAchieved ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                    style={{ width: `${pointsPercent}%` }}
                  />
                </View>
              </View>
            ) : null}

            {/* Rank Goal Row */}
            {rankTarget !== null ? (
              <View className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-3.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <SymbolView
                      name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }}
                      size={15}
                      tintColor="#facc15"
                    />
                    <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">Global Rank Target</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    {rankAchieved ? (
                      <View className="flex-row items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5">
                        <SymbolView
                          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                          size={11}
                          tintColor="#34d399"
                        />
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Achieved</Text>
                      </View>
                    ) : globalRank !== null ? (
                      <View className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-amber-300">In Progress</Text>
                      </View>
                    ) : (
                      <Text className="text-xs text-slate-400">Unranked</Text>
                    )}
                  </View>
                </View>

                {/* Numbers */}
                <View className="mt-2 flex-row items-baseline justify-between">
                  <Text className="text-lg font-extrabold text-white">
                    {globalRank !== null ? `#${globalRank.toLocaleString()}` : 'Unranked'}{' '}
                    <Text className="text-xs font-medium text-slate-400">/ Top #{rankTarget.toLocaleString()}</Text>
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {rankAchieved
                      ? 'Target crushed! 🏆'
                      : rankDistance !== null && rankDistance > 0
                      ? `${rankDistance.toLocaleString()} spots to climb`
                      : 'Climbing up'}
                  </Text>
                </View>

                {/* Rank Visual Track */}
                <View className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <View
                    className={`h-full rounded-full ${rankAchieved ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{
                      width: rankAchieved
                        ? '100%'
                        : globalRank !== null
                        ? `${Math.max(10, Math.min(95, Math.round((rankTarget / globalRank) * 100)))}%`
                        : '15%',
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasGoals ? 'Edit personal goals' : 'Set personal goals'}
          className="flex-row items-center gap-1 self-end rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 active:bg-slate-700"
          onPress={openModal}
        >
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={13}
            tintColor="#94a3b8"
          />
          <Text className="text-xs font-semibold text-slate-300">
            {hasGoals ? 'Edit' : 'Set Goals'}
          </Text>
        </Pressable>
      </View>

      {/* Goal Setting Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-4">
          <View
            accessibilityLabel="Edit Season Goals Dialog"
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <SymbolView
                  name={{ ios: 'flag.fill', android: 'flag', web: 'flag' }}
                  size={18}
                  tintColor="#67e8f9"
                />
                <Text className="text-lg font-bold text-white">Set Season Milestones</Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-800 active:bg-slate-700"
                onPress={() => setIsModalOpen(false)}
              >
                <Text className="font-bold text-slate-400">✕</Text>
              </Pressable>
            </View>

            <Text className="mt-1 text-xs text-slate-400">
              Set goals to monitor your season journey. Leave an input blank to remove that goal.
            </Text>

            {validationError ? (
              <View className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-2.5">
                <Text className="text-xs font-semibold text-red-300">{validationError}</Text>
              </View>
            ) : null}

            {/* Points Goal Input */}
            <View className="mt-4 gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Points Target (e.g. 500)
              </Text>
              <TextInput
                value={pointsInput}
                onChangeText={setPointsInput}
                placeholder="e.g. 500"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-base font-medium text-white"
              />
              {/* Presets */}
              <View className="mt-1 flex-row flex-wrap gap-1.5">
                {POINTS_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setPointsInput(String(preset))}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 active:bg-slate-700"
                  >
                    <Text className="text-[11px] font-semibold text-slate-300">{preset} pts</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Rank Goal Input */}
            <View className="mt-4 gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Global Rank Target (e.g. Top 100)
              </Text>
              <TextInput
                value={rankInput}
                onChangeText={setRankInput}
                placeholder="e.g. 100"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-base font-medium text-white"
              />
              {/* Presets */}
              <View className="mt-1 flex-row flex-wrap gap-1.5">
                {RANK_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setRankInput(String(preset))}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 active:bg-slate-700"
                  >
                    <Text className="text-[11px] font-semibold text-slate-300">Top #{preset}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-6 flex-row gap-2.5">
              <Pressable
                accessibilityRole="button"
                className="flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 py-3 active:bg-slate-700"
                onPress={() => setIsModalOpen(false)}
                disabled={mutation.isPending}
              >
                <Text className="text-sm font-semibold text-slate-300">Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-cyan-400 bg-cyan-500 py-3 active:bg-cyan-600"
                onPress={handleSave}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <ActivityIndicator size="small" color="#090d16" />
                ) : (
                  <Text className="text-sm font-bold text-slate-950">Save Goals</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
