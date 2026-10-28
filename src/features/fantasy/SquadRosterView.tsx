import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { FantasyLineupEntry, FantasyPlayer } from './api';

type SquadFilter = 'all' | 'starters' | 'bench';
type SquadView = 'pitch' | 'grid';

const STARTER_SLOTS = [
  { slot: 'offlane', label: 'Offlane · Pos 3' },
  { slot: 'mid', label: 'Mid · Pos 2' },
  { slot: 'support', label: 'Support · Pos 4' },
  { slot: 'hard_support', label: 'Hard Support · Pos 5' },
  { slot: 'carry', label: 'Carry · Pos 1' },
] as const;

function playerName(player: FantasyPlayer): string {
  return player.in_game_name || player.name;
}

function normalizeRole(role: string | null): string {
  return role?.trim().toLowerCase().replaceAll(' ', '_') ?? '';
}

function roleLabel(role: string | null): string {
  return role?.replaceAll('_', ' ') ?? 'Role unavailable';
}

function roleColors(role: string | null) {
  switch (normalizeRole(role)) {
    case 'carry':
      return {
        card: 'border-amber-700/60 bg-amber-950/30',
        accent: 'text-amber-200',
        badgeBackground: 'bg-amber-900/70',
        badgeText: 'text-amber-100',
      };
    case 'mid':
      return {
        card: 'border-cyan-700/60 bg-cyan-950/30',
        accent: 'text-cyan-200',
        badgeBackground: 'bg-cyan-900/70',
        badgeText: 'text-cyan-200',
      };
    case 'offlane':
      return {
        card: 'border-emerald-300/50 bg-emerald-500/10',
        accent: 'text-emerald-300',
        badgeBackground: 'bg-emerald-500/20',
        badgeText: 'text-emerald-300',
      };
    case 'support':
      return {
        card: 'border-sky-700/60 bg-sky-950/30',
        accent: 'text-cyan-200',
        badgeBackground: 'bg-sky-900/70',
        badgeText: 'text-cyan-200',
      };
    case 'hard_support':
      return {
        card: 'border-brand-600/60 bg-brand-500/10',
        accent: 'text-brand-300',
        badgeBackground: 'bg-brand-500/20',
        badgeText: 'text-brand-200',
      };
    default:
      return {
        card: 'border-slate-700 bg-slate-950',
        accent: 'text-slate-50',
        badgeBackground: 'bg-slate-800',
        badgeText: 'text-slate-300',
      };
  }
}

function PlayerCard({
  player,
  entry,
}: {
  player: FantasyPlayer;
  entry: FantasyLineupEntry | undefined;
}) {
  const colors = roleColors(player.primary_role);
  return (
    <Link href={`/player/${player.id}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`View ${playerName(player)}, ${roleLabel(player.primary_role)}`}
        className={`min-h-24 flex-1 gap-2 rounded-xl border p-3 ${colors.card}`}
      >
        <View className="flex-row items-center gap-2">
          {player.profile_image_url ? (
            <Image source={{ uri: player.profile_image_url }} className="h-9 w-9 rounded-full" />
          ) : (
            <View className={`h-9 w-9 items-center justify-center rounded-full ${colors.badgeBackground}`}>
              <Text className={`text-xs font-bold ${colors.accent}`}>{playerName(player).slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text className={`font-semibold ${colors.accent}`} numberOfLines={1}>{playerName(player)}</Text>
            {player.professional_teams?.name ? (
              <Text className="text-[10px] text-slate-400" numberOfLines={1}>{player.professional_teams.name}</Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Badge label={roleLabel(player.primary_role)} colors={colors} />
          <Badge label={`${player.current_price.toFixed(1)}M`} colors={colors} />
          {entry?.is_captain ? <Badge label="Captain" highlighted /> : null}
          {entry?.is_vice_captain ? <Badge label="Vice-captain" highlighted /> : null}
          {player.availability_status ? <Badge label={player.availability_status.replaceAll('_', ' ')} colors={colors} /> : null}
        </View>
        <Text className="text-[10px] text-slate-400">
          Last GW {player.last_gw_points} pts · Recent avg {player.recent_points} pts
        </Text>
      </Pressable>
    </Link>
  );
}

function Badge({
  label,
  highlighted = false,
  colors,
}: {
  label: string;
  highlighted?: boolean;
  colors?: ReturnType<typeof roleColors>;
}) {
  return (
    <View className={`rounded-full px-2 py-1 ${
      highlighted
        ? 'bg-amber-400/20'
        : colors?.badgeBackground ?? 'bg-slate-800'
    }`}>
      <Text className={`text-[10px] font-semibold ${
        highlighted ? 'text-amber-200' : colors?.badgeText ?? 'text-slate-300'
      }`}>
        {label}
      </Text>
    </View>
  );
}

export function SquadRosterView({
  players,
  lineup,
}: {
  players: FantasyPlayer[];
  lineup: FantasyLineupEntry[];
}) {
  const [filter, setFilter] = useState<SquadFilter>('all');
  const [view, setView] = useState<SquadView>('pitch');
  const [selectedRole, setSelectedRole] = useState('all');
  const entriesByPlayer = useMemo(
    () => new Map(lineup.map((entry) => [entry.player_id, entry])),
    [lineup],
  );
  const starterBySlot = useMemo(() => {
    const assigned = new Map<string, FantasyPlayer>();
    for (const { slot } of STARTER_SLOTS) {
      const lineupEntry = lineup.find((entry) => entry.is_starter && entry.slot === slot);
      const lineupPlayer = lineupEntry
        ? players.find((player) => player.id === lineupEntry.player_id)
        : undefined;
      const role = slot === 'hard_support' ? 'hard_support' : slot;
      const fallbackPlayer = players.find((player) =>
        normalizeRole(player.primary_role) === role &&
        ![...assigned.values()].some((selected) => selected.id === player.id)
      );
      const selected = lineupPlayer ?? fallbackPlayer;
      if (selected) assigned.set(slot, selected);
    }
    return assigned;
  }, [lineup, players]);
  const starterIds = new Set([...starterBySlot.values()].map((player) => player.id));
  const starters = players.filter((player) => starterIds.has(player.id));
  const bench = players.filter((player) => !starterIds.has(player.id));
  const filteredPlayers = players.filter((player) => {
    const isStarter = starterIds.has(player.id);
    if (filter === 'starters' && !isStarter) return false;
    if (filter === 'bench' && isStarter) return false;
    return selectedRole === 'all' || normalizeRole(player.primary_role) === selectedRole;
  });
  const roleOptions = ['all', 'carry', 'mid', 'offlane', 'support', 'hard_support'];

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        {([
          ['all', `All Squad ${players.length}`],
          ['starters', `Starting 5 ${starters.length}`],
          ['bench', `Bench ${bench.length}`],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === key }}
            className={`min-h-10 items-center justify-center rounded-full border px-3 ${
              filter === key ? 'border-teal-500/60 bg-teal-500/15' : 'border-slate-700 bg-slate-950'
            }`}
            onPress={() => setFilter(key)}
          >
            <Text className={`text-xs font-semibold ${filter === key ? 'text-teal-200' : 'text-slate-300'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {roleOptions.map((role) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedRole === role }}
            className={`min-h-9 justify-center rounded-full border px-3 ${
              selectedRole === role ? 'border-cyan-500/60 bg-cyan-500/15' : 'border-slate-800 bg-slate-900'
            }`}
            onPress={() => setSelectedRole(role)}
          >
            <Text className={`text-xs font-medium ${selectedRole === role ? 'text-cyan-200' : 'text-slate-400'}`}>
              {role === 'all' ? 'All roles' : roleLabel(role)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View accessibilityRole="tablist" className="flex-row gap-2">
        {([
          ['pitch', 'Pitch view'],
          ['grid', 'Grid view'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === key }}
            className={`min-h-10 flex-1 items-center justify-center rounded-lg border ${
              view === key ? 'border-brand-500 bg-brand-500/15' : 'border-slate-700 bg-slate-950'
            }`}
            onPress={() => setView(key)}
          >
            <Text className={`text-xs font-semibold ${view === key ? 'text-brand-300' : 'text-slate-400'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {view === 'pitch' && filter !== 'bench' ? (
        <View accessibilityLabel="Tactical starting lineup" className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-cyan-300">Starting Five</Text>
          {!lineup.some((entry) => entry.is_starter) ? (
            <Text className="text-xs text-slate-400">Suggested role layout · not saved to your lineup</Text>
          ) : null}
          {STARTER_SLOTS
            .filter(({ slot }) => selectedRole === 'all' || selectedRole === slot ||
              ((slot === 'support' || slot === 'hard_support') &&
                (selectedRole === 'support' || selectedRole === 'hard_support')))
            .map(({ slot, label }) => {
              const player = starterBySlot.get(slot);
              const entry = player ? entriesByPlayer.get(player.id) : undefined;
              return (
                <View key={slot} className="min-h-20 flex-row items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2">
                  <Text className="w-28 text-[10px] font-semibold uppercase text-slate-400">{label}</Text>
                  {player ? (
                    <PlayerCard player={player} entry={entry} />
                  ) : (
                    <View className="flex-1 rounded-lg border border-dashed border-slate-700 p-3">
                      <Text className="text-xs text-slate-500">No player assigned</Text>
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      ) : null}

      {view === 'pitch' && filter !== 'starters' ? (
        <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">Bench / Reserves</Text>
            <Text className="text-xs text-slate-500">{bench.length} players</Text>
          </View>
          {bench.length ? (
            <View className="gap-2">
              {bench
                .filter((player) => selectedRole === 'all' || normalizeRole(player.primary_role) === selectedRole)
                .map((player) => <PlayerCard key={player.id} player={player} entry={entriesByPlayer.get(player.id)} />)}
            </View>
          ) : (
            <Text className="text-sm text-slate-500">No substitutes on the bench.</Text>
          )}
        </View>
      ) : null}

      {view === 'grid' ? (
        filteredPlayers.length ? (
          <View className="gap-2">
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} entry={entriesByPlayer.get(player.id)} />
            ))}
          </View>
        ) : (
          <Text className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
            No squad players match these filters.
          </Text>
        )
      ) : null}
    </View>
  );
}
