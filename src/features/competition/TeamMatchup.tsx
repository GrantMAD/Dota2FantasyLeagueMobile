import { Text, View } from 'react-native';
import { TeamLogo } from '@/src/components/TeamLogo';
import type { MatchSummary } from './api';

interface TeamMatchupProps {
  radiantTeam: MatchSummary['radiant_team'];
  direTeam: MatchSummary['dire_team'];
  /** Render only the radiant side (used in split card layout) */
  isRadiantOnly?: boolean;
  /** Render only the dire side (used in split card layout) */
  isDireOnly?: boolean;
  /** Whether this team is the series winner */
  isWinner?: boolean;
  /** Whether the series is fully completed (affects name colour) */
  isCompleted?: boolean;
}

export function TeamMatchup({
  radiantTeam,
  direTeam,
  isRadiantOnly = false,
  isDireOnly = false,
  isWinner = false,
  isCompleted = false,
}: TeamMatchupProps) {
  const radiantName = radiantTeam?.name ?? 'Team TBA';
  const direName = direTeam?.name ?? 'Team TBA';
  const radiantTag = radiantTeam?.tag ?? 'TBA';
  const direTag = direTeam?.tag ?? 'TBA';

  const nameColour = isWinner
    ? 'text-white'
    : isCompleted
      ? 'text-slate-500'
      : 'text-white';

  // ── Single-team (split layout) renders ──────────────────────────────────────

  if (isRadiantOnly) {
    return (
      <View className="items-center gap-2">
        <TeamLogo
          logoUrl={radiantTeam?.logo_url}
          name={radiantName}
          tag={radiantTag}
          size={44}
        />
        <View className="items-center gap-0.5">
          <Text numberOfLines={1} className={`font-black text-[13px] tracking-tight leading-none max-w-[90px] text-center ${nameColour}`}>
            {radiantName}
          </Text>
          <Text className="text-[9px] font-bold tracking-widest uppercase text-emerald-500/60">
            Radiant
          </Text>
        </View>
      </View>
    );
  }

  if (isDireOnly) {
    return (
      <View className="items-center gap-2">
        <TeamLogo
          logoUrl={direTeam?.logo_url}
          name={direName}
          tag={direTag}
          size={44}
        />
        <View className="items-center gap-0.5">
          <Text numberOfLines={1} className={`font-black text-[13px] tracking-tight leading-none max-w-[90px] text-center ${nameColour}`}>
            {direName}
          </Text>
          <Text className="text-[9px] font-bold tracking-widest uppercase text-rose-500/60">
            Dire
          </Text>
        </View>
      </View>
    );
  }

  // ── Full side-by-side layout (legacy / unchanged usage) ─────────────────────

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
