import { Text, View } from 'react-native';
import type { MatchSummary } from './api';

interface TeamMatchupProps {
  radiantTeam: MatchSummary['radiant_team'];
  direTeam: MatchSummary['dire_team'];
}

export function TeamMatchup({ radiantTeam, direTeam }: TeamMatchupProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
        <Text className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-200">
          {radiantTeam?.tag ?? 'TBA'}
        </Text>
        <Text numberOfLines={2} className="flex-1 font-semibold text-white">
          {radiantTeam?.name ?? 'Team TBA'}
        </Text>
      </View>
      <Text className="text-xs font-medium text-slate-500">VS</Text>
      <View className="flex-1 flex-row items-center justify-end gap-2">
        <Text numberOfLines={2} className="flex-1 text-right font-semibold text-white">
          {direTeam?.name ?? 'Team TBA'}
        </Text>
        <Text className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-200">
          {direTeam?.tag ?? 'TBA'}
        </Text>
      </View>
    </View>
  );
}
