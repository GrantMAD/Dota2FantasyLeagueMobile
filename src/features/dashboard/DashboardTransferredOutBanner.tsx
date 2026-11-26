import { Text, View } from 'react-native';
import type { FantasyPlayer } from '@/src/features/fantasy/api';

type TransferredOutStarter = {
  player_id: number;
  professional_players: Pick<FantasyPlayer, 'name' | 'in_game_name'> | null;
};

export function DashboardTransferredOutBanner({
  starters,
  ownedPlayerIds,
  isDark,
}: {
  starters: TransferredOutStarter[];
  ownedPlayerIds: number[];
  isDark: boolean;
}) {
  const ownedIds = new Set(ownedPlayerIds);
  const names = starters
    .filter((starter) => !ownedIds.has(starter.player_id))
    .map((starter) => {
      const player = starter.professional_players;
      return player?.in_game_name?.trim() || player?.name || `Player ${starter.player_id}`;
    });

  if (names.length === 0) return null;

  return (
    <View
      accessibilityLabel={`Players no longer in your squad: ${names.join(', ')}`}
      accessibilityLiveRegion="polite"
      className="gap-1 rounded-xl border p-3"
      style={{
        borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fcd34d',
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.05)' : '#fffbeb',
      }}
    >
      <Text
        className="text-xs font-bold"
        style={{ color: isDark ? '#fde68a' : '#92400e' }}
      >
        No longer in your squad: {names.join(', ')}
      </Text>
      <Text
        className="text-xs leading-5"
        style={{ color: isDark ? '#fcd34d' : '#b45309' }}
      >
        These players remain in this gameweek&apos;s saved lineup but won&apos;t be available for the next gameweek.
      </Text>
    </View>
  );
}
