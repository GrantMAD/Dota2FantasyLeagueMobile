import { Text, View } from 'react-native';
import { TeamLogo } from '@/src/components/TeamLogo';
import type { MatchSummary } from './api';

interface TeamMatchupProps {
  radiantTeam: MatchSummary['radiant_team'];
  direTeam: MatchSummary['dire_team'];
}

export function TeamMatchup({ radiantTeam, direTeam }: TeamMatchupProps) {
  const radiantName = radiantTeam?.name ?? 'Team TBA';
  const direName = direTeam?.name ?? 'Team TBA';
  const radiantTag = radiantTeam?.tag ?? 'TBA';
  const direTag = direTeam?.tag ?? 'TBA';

  return (
    <View className="flex-row items-center justify-between gap-2">
      {/* Radiant Team (Left) */}
      <View className="flex-1 min-w-0 flex-row items-center gap-2.5">
        <TeamLogo
          logoUrl={radiantTeam?.logo_url}
          name={radiantName}
          tag={radiantTag}
          size={36}
        />
        <View className="flex-1 min-w-0">
          <Text numberOfLines={1} className="font-bold text-xs text-white leading-4">
            {radiantName}
          </Text>
          <Text className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5">
            {radiantTag}
          </Text>
        </View>
      </View>

      {/* Central VS Pill */}
      <View className="shrink-0 items-center justify-center rounded-full bg-slate-950 border border-slate-800 px-2.5 py-1">
        <Text className="text-[10px] font-black text-slate-400 font-mono">VS</Text>
      </View>

      {/* Dire Team (Right) */}
      <View className="flex-1 min-w-0 flex-row items-center justify-end gap-2.5">
        <View className="flex-1 min-w-0 items-end">
          <Text numberOfLines={1} className="font-bold text-xs text-white leading-4 text-right">
            {direName}
          </Text>
          <Text className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5 text-right">
            {direTag}
          </Text>
        </View>
        <TeamLogo
          logoUrl={direTeam?.logo_url}
          name={direName}
          tag={direTag}
          size={36}
        />
      </View>
    </View>
  );
}
