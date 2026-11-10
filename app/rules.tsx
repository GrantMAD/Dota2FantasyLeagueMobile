import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type LayoutChangeEvent, type ScrollView as ScrollViewRef } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const ruleSections = [
  { id: 'squad', label: 'Squad', icon: '👥', searchText: 'roles bench substitutes support hard support squad budget players' },
  { id: 'captain', label: 'Captaincy', icon: '👑', searchText: 'captain vice captain triple multiplier participation' },
  { id: 'scoring', label: 'Scoring', icon: '📊', searchText: 'points kills assists deaths economy objective performance index role bonus series match calculator' },
  { id: 'chips', label: 'Chips', icon: '✨', searchText: 'wildcard triple captain bench boost transfers' },
  { id: 'transfers', label: 'Transfers', icon: '🔁', searchText: 'free transfer hit penalty budget price ownership' },
  { id: 'deadlines', label: 'Deadlines', icon: '⏱️', searchText: 'lock timestamp gameweek lineup deadline' },
  { id: 'leagues', label: 'Leagues', icon: '🏆', searchText: 'classic head to head h2h draw bye wins losses standings invite participants' },
  { id: 'faq', label: 'FAQ', icon: '❔', searchText: 'frequently asked questions common help answers' },
  { id: 'hood', label: 'Under the Hood', icon: '⚙️', searchText: 'jobs schedule notifications global rankings data pipeline availability conflict resolution' },
] as const;

type RuleSectionId = (typeof ruleSections)[number]['id'];
const roleNames = ['Carry', 'Mid', 'Offlane', 'Support', 'Hard Support'] as const;
type RoleName = (typeof roleNames)[number];
type CalculatorField = 'kills' | 'assists' | 'deaths' | 'gpm' | 'xpm' | 'lastHits' | 'denies' | 'heroDamage' | 'towerDamage' | 'healing' | 'wardsPlaced' | 'wardsDestroyed' | 'roshanKills' | 'duration';
type CalculatorInputs = Record<CalculatorField, string>;

const calculatorFields: { field: CalculatorField; label: string }[] = [
  { field: 'kills', label: 'Kills' },
  { field: 'assists', label: 'Assists' },
  { field: 'deaths', label: 'Deaths' },
  { field: 'gpm', label: 'GPM' },
  { field: 'xpm', label: 'XPM' },
  { field: 'lastHits', label: 'Last hits' },
  { field: 'denies', label: 'Denies' },
  { field: 'heroDamage', label: 'Hero damage' },
  { field: 'towerDamage', label: 'Tower damage' },
  { field: 'healing', label: 'Healing' },
  { field: 'wardsPlaced', label: 'Wards placed' },
  { field: 'wardsDestroyed', label: 'Wards destroyed' },
  { field: 'roshanKills', label: 'Roshan kills' },
  { field: 'duration', label: 'Match minutes' },
];

const defaultCalculatorInputs: CalculatorInputs = {
  kills: '0', assists: '0', deaths: '0', gpm: '0', xpm: '0', lastHits: '0', denies: '0',
  heroDamage: '0', towerDamage: '0', healing: '0', wardsPlaced: '0', wardsDestroyed: '0',
  roshanKills: '0', duration: '40',
};

const roleBenchmarks: Record<RoleName, { gpm: number; xpm: number; lastHitsPerMinute: number; heroDamage: number; towerDamage: number; healing: number }> = {
  Carry: { gpm: 550, xpm: 600, lastHitsPerMinute: 6, heroDamage: 25000, towerDamage: 3000, healing: 1000 },
  Mid: { gpm: 450, xpm: 550, lastHitsPerMinute: 5, heroDamage: 20000, towerDamage: 2000, healing: 1500 },
  Offlane: { gpm: 350, xpm: 450, lastHitsPerMinute: 3, heroDamage: 18000, towerDamage: 2500, healing: 2000 },
  Support: { gpm: 250, xpm: 350, lastHitsPerMinute: 3, heroDamage: 12000, towerDamage: 1500, healing: 5000 },
  'Hard Support': { gpm: 200, xpm: 300, lastHitsPerMinute: 3, heroDamage: 10000, towerDamage: 1000, healing: 6000 },
};

function calculateDefaultScoreEstimate(
  inputs: CalculatorInputs,
  role: RoleName,
  teamWon: boolean,
  seriesClincher: boolean,
  previousPerformanceStreak: number,
) {
  const value = (field: CalculatorField) => {
    const parsed = Number(inputs[field]);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  const benchmarks = roleBenchmarks[role];
  const duration = value('duration') || 40;
  const kills = value('kills');
  const assists = value('assists');
  const deaths = value('deaths');
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  const combat = Math.max(0, kills * 1.5 + assists * 0.75 + (kda >= 5 ? 2 : kda >= 3 ? 1 : 0));
  const economy = Math.min(value('gpm') / benchmarks.gpm, 1.5) * 5
    + Math.min(value('xpm') / benchmarks.xpm, 1.5) * 4
    + Math.min(value('lastHits') / ((duration / 60) * benchmarks.lastHitsPerMinute), 1.3) * 2
    + value('denies') * 0.1;
  const objective = Math.min(value('heroDamage') / benchmarks.heroDamage, 1.5) * 4
    + Math.min(value('towerDamage') / benchmarks.towerDamage, 1.5) * 2
    + Math.min(value('healing') / benchmarks.healing, 1.5) * 3
    + value('roshanKills') * 2
    + value('wardsPlaced') * 0.5
    + value('wardsDestroyed') * 0.3;
  const performanceIndex = Math.min(100, Math.max(0, ((combat + economy + objective) / 40) * 100));
  const performanceBonus = performanceIndex >= 90 ? 5 : performanceIndex >= 80 ? 3 : performanceIndex >= 70 ? 1 : 0;
  const components = [
    ['Combat', combat],
    ['Economy', economy],
    ['Objective', objective],
    ['Teamfight', value('heroDamage') * 0.0004 + value('healing') * 0.0015 + value('towerDamage') * 0.0008],
    ['Match win', teamWon ? 5 : 0],
    ['Series clincher', teamWon && seriesClincher ? 3 : 0],
    ['Performance bonus', performanceBonus],
    ['Consistency', performanceIndex >= 80 && previousPerformanceStreak >= 2 ? 1 : 0],
    ['Death penalty', -deaths],
  ] as const;
  const roundedComponents = components.map(([name, points]) => [name, Math.round(points * 100) / 100] as const);

  return {
    performanceIndex,
    components: roundedComponents,
    total: roundedComponents.reduce((sum, [, points]) => sum + points, 0),
  };
}

const scoringRows = [
  ['Kill', '+1.5', 'Combat', 'Positive combat impact'],
  ['Assist', '+0.75', 'Combat', 'Teamfight contribution'],
  ['Death', '-1.0 each', 'Penalty', 'Deduction for dying'],
  ['KDA bonus (KDA ≥ 5.0)', '+2.0', 'Combat', 'High efficiency reward'],
  ['KDA bonus (KDA ≥ 3.0)', '+1.0', 'Combat', 'Solid efficiency reward'],
  ['GPM (role-adjusted)', 'Up to +7.5', 'Economy', 'Role-benchmarked gold farm'],
  ['XPM (role-adjusted)', 'Up to +6.0', 'Economy', 'Role-benchmarked experience'],
  ['Last hits (role-adjusted)', 'Up to +2.6', 'Economy', 'Lane and jungle farming'],
  ['Denies', '+0.1 each', 'Economy', 'XP denial to opponents'],
  ['Hero damage (role-adjusted)', 'Up to +6.0', 'Objective', 'Damage dealt to enemy heroes'],
  ['Tower damage (role-adjusted)', 'Up to +3.0', 'Objective', 'Building siege damage'],
  ['Healing (role-adjusted)', 'Up to +4.5', 'Objective', 'Sustain provided to the team'],
  ['Wards placed', '+0.5 each', 'Objective', 'Observer and Sentry vision'],
  ['Wards destroyed', '+0.3 each', 'Objective', 'Counter-ward dewarding'],
  ['Roshan kill', '+2.0 each', 'Objective', 'Securing the Aegis of the Immortal'],
  ['Teamfight proxy', 'Formula proxy', 'Teamfight', 'Damage × 0.0004 + healing × 0.0015 + tower damage × 0.0008'],
  ['Game win', '+5.0', 'Match result', 'Flat bonus for map victory'],
  ['Series win', '+3.0', 'Series', 'Awarded to the winning team in the clinching match only'],
  ['Performance index (≥ 90)', '+5.0', 'Role execution', 'Tier 1 performance mastery'],
  ['Performance index (≥ 80)', '+3.0', 'Role execution', 'Tier 2 performance excellence'],
  ['Performance index (≥ 70)', '+1.0', 'Role execution', 'Tier 3 performance consistency'],
  ['Consistency bonus', '+1.0', 'Consistency', 'Three consecutive matches with index ≥ 80, including the current match'],
];

const jobs = [
  ['Roster changes', 'Detects overnight player team transfers', 'Daily · 2:00 UTC'],
  ['Player sync', 'Refreshes the professional player database', 'Daily · 3:00 UTC'],
  ['Team sync', 'Refreshes professional team rosters', 'Daily · 3:15 UTC'],
  ['Tournament discovery', 'Finds and registers active tournaments', 'Every 6 hours'],
  ['Match fetch', 'Pulls new scheduled and live matches', 'Every hour'],
  ['Match details', 'Ingests per-player match statistics', 'Every 30 minutes'],
  ['Process completed', 'Locks finished matches ready for scoring', 'Hourly at :45 UTC'],
  ['Score calculation', 'Calculates fantasy score breakdowns', 'Hourly at :50 UTC'],
  ['Gameweek recalculation', 'Updates gameweek totals', 'Hourly at :55 UTC'],
  ['League recalculation', 'Updates league standings and head-to-head results', 'Hourly at :00 UTC'],
  ['Global rankings', 'Ranks fantasy teams by season points', 'Hourly at :05 UTC'],
  ['Price updates', 'Recalculates player prices', 'Every 10 minutes'],
  ['Deadline notifications', 'Checks approaching deadlines and lineup status', 'Every 15 minutes'],
  ['Price change notifications', 'Alerts managers to significant player price changes', 'Every 15 minutes'],
  ['Unavailable player alerts', 'Checks unavailable players in manager squads', 'Every 30 minutes'],
  ['Rank notifications', 'Alerts managers to rank changes', 'Hourly at :10 UTC'],
  ['Gameweek transitions', 'Activates and closes gameweeks', 'Every 5 minutes'],
  ['Conflict resolution', 'Resolves eligible player and team conflicts', 'Daily at 03:45 UTC'],
];

function RuleSection({
  id,
  title,
  expanded,
  onToggle,
  onLayout,
  children,
}: PropsWithChildren<{
  id: RuleSectionId;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}>) {
  return (
    <View onLayout={onLayout} className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} rules`}
        accessibilityHint={`Section ${id}. Tap to ${expanded ? 'collapse' : 'expand'} its rules.`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="min-h-11 flex-row items-center justify-between gap-3"
      >
        <Text accessibilityRole="header" className="flex-1 text-xl font-bold text-slate-50">{title}</Text>
        <Text className="text-xl font-bold text-slate-400">{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>
      {expanded ? children : null}
    </View>
  );
}

function RuleText({ children }: PropsWithChildren) {
  return <Text className="text-sm leading-6 text-slate-300">{children}</Text>;
}

function Bullet({ children }: PropsWithChildren) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-cyan-300">•</Text>
      <Text className="flex-1 text-sm leading-6 text-slate-300">{children}</Text>
    </View>
  );
}

export default function RulesScreen() {
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const scrollRef = useRef<ScrollViewRef>(null);
  const [sectionOffsets, setSectionOffsets] = useState<Partial<Record<RuleSectionId, number>>>({});
  const [query, setQuery] = useState('');
  const [calculatorInputs, setCalculatorInputs] = useState<CalculatorInputs>(defaultCalculatorInputs);
  const [calculatorRole, setCalculatorRole] = useState<RoleName>('Carry');
  const [teamWon, setTeamWon] = useState(false);
  const [seriesClincher, setSeriesClincher] = useState(false);
  const [previousPerformanceStreak, setPreviousPerformanceStreak] = useState(0);
  const [expandedFaqs, setExpandedFaqs] = useState<string[]>([]);
  const sectionParam = Array.isArray(params.section) ? params.section[0] : params.section;
  const selectedSection = ruleSections.find((section) => section.id === sectionParam)?.id;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSections = ruleSections.filter((section) =>
    !normalizedQuery || `${section.label} ${section.searchText}`.toLocaleLowerCase().includes(normalizedQuery)
  );
  const scoreEstimate = calculateDefaultScoreEstimate(
    calculatorInputs,
    calculatorRole,
    teamWon,
    seriesClincher,
    previousPerformanceStreak,
  );
  const [expandedSections, setExpandedSections] = useState<RuleSectionId[]>(
    () => ruleSections
      .filter((section) => section.id !== 'hood' || section.id === selectedSection)
      .map((section) => section.id)
  );

  useEffect(() => {
    if (selectedSection === undefined) return;
    const offset = sectionOffsets[selectedSection];
    if (offset === undefined) return;
    scrollRef.current?.scrollTo({ y: offset, animated: true });
  }, [sectionOffsets, selectedSection]);

  function goToSection(id: RuleSectionId) {
    if (!expandedSections.includes(id)) setExpandedSections((current) => [...current, id]);
    const offset = sectionOffsets[id];
    if (offset !== undefined) scrollRef.current?.scrollTo({ y: offset, animated: true });
  }

  function toggleSection(id: RuleSectionId) {
    setExpandedSections((current) => current.includes(id)
      ? current.filter((sectionId) => sectionId !== id)
      : [...current, id]);
  }

  function onSectionLayout(id: RuleSectionId, event: LayoutChangeEvent) {
    const offset = event.nativeEvent.layout.y;
    setSectionOffsets((current) => current[id] === offset ? current : { ...current, [id]: offset });
  }

  function toggleFaq(question: string) {
    setExpandedFaqs((current) => current.includes(question)
      ? current.filter((item) => item !== question)
      : [...current, question]);
  }

  function isSectionExpanded(id: RuleSectionId) {
    return expandedSections.includes(id) || (normalizedQuery.length > 0 && visibleSections.some((section) => section.id === id));
  }

  return (
    <Screen>
      <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <View className="gap-3">
          <Link href="/learn"><Text className="font-semibold text-cyan-300">‹ Learn hub</Text></Link>
          <View className="gap-2 rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
            <Text className="self-start rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              📜 Official rulebook
            </Text>
            <Text accessibilityRole="header" className="text-3xl font-bold text-slate-50">Game rules & scoring</Text>
            <Text className="text-sm leading-6 text-slate-300">
              Everything you need to build a legal squad, score points, manage chips, and stay ahead of each gameweek deadline.
            </Text>
            <Text className="text-xs leading-5 text-slate-400">
              Current default scoring is summarized below. Published scoring rules for your season take precedence.
            </Text>
            <Text className="text-xs text-slate-500">Page updated November 10, 2026.</Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-slate-200">Search the rules</Text>
          <TextInput
            accessibilityLabel="Search the rules"
            value={query}
            onChangeText={setQuery}
            placeholder="Search scoring, deadlines, captain..."
            placeholderTextColor="#64748b"
            returnKeyType="search"
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
          />
          {normalizedQuery ? (
            <Text accessibilityLiveRegion="polite" className="text-xs text-slate-400">
              {visibleSections.length
                ? `${visibleSections.length} ${visibleSections.length === 1 ? 'section' : 'sections'} match.`
                : 'No matching rules found.'}
            </Text>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {visibleSections.map((section) => (
            <Pressable
              key={section.id}
              accessibilityRole="button"
              accessibilityLabel={`Jump to ${section.label} rules`}
              onPress={() => goToSection(section.id)}
              className="min-h-10 flex-row items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3"
            >
              <Text accessibilityElementsHidden>{section.icon}</Text>
              <Text className="text-xs font-semibold text-slate-200">{section.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Link href="/team" asChild>
          <Pressable className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-amber-500 px-4">
            <Text className="font-bold text-amber-950">Set a lineup</Text>
            <Text className="font-bold text-amber-950">→</Text>
          </Pressable>
        </Link>

        {visibleSections.some((section) => section.id === 'squad') ? <RuleSection id="squad" title="Squad structure" expanded={isSectionExpanded('squad')} onToggle={() => toggleSection('squad')} onLayout={(event) => onSectionLayout('squad', event)}>
          <View className="flex-row flex-wrap gap-2">
            {[
              ['Budget', '$45.0M'],
              ['Squad size', '8 players'],
              ['Starting lineup', '5 roles'],
              ['Optional bench', 'Up to 3'],
            ].map(([label, value]) => (
              <View key={label} className="min-w-[45%] flex-1 rounded-xl bg-slate-950 p-3">
                <Text className="text-xs text-slate-500">{label}</Text>
                <Text className="mt-1 font-bold text-slate-50">{value}</Text>
              </View>
            ))}
          </View>
          <RuleText>
            Fill one starting slot for Carry, Mid, Offlane, Support, and Hard Support. Support and Hard Support players
            can fill either support starting slot. Bench slots are optional. A maximum of three owned players may come
            from the same professional team; duplicate players are not allowed.
          </RuleText>
          <View className="gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <Text className="font-semibold text-cyan-300">Auto-bench replacement order</Text>
            <RuleText>
              If a starter does not play, the system checks Bench 1, then Bench 2, then Bench 3. A substitute must have
              played in that gameweek, match the absent starter’s exact role (Support and Hard Support are distinct
              for substitutions), and can replace only one starter. If no eligible substitute exists, the absent starter scores zero.
            </RuleText>
          </View>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'captain') ? <RuleSection id="captain" title="Captaincy & vice-captain" expanded={isSectionExpanded('captain')} onToggle={() => toggleSection('captain')} onLayout={(event) => onSectionLayout('captain', event)}>
          <Bullet>Choose one captain and a different vice-captain from the five starters before the deadline.</Bullet>
          <Bullet>The captain receives a 2× multiplier.</Bullet>
          <Bullet>If the captain has no recorded match participation, the vice-captain receives the captain multiplier.</Bullet>
          <Bullet>With Triple Captain active, the captain multiplier is 3× and the vice-captain fallback also receives 3×.</Bullet>
          <Bullet>If neither captain nor vice-captain has recorded participation, neither receives a captain multiplier.</Bullet>
          <View className="rounded-xl bg-slate-950 p-3">
            <Text className="font-semibold text-amber-300">Triple Captain fallback</Text>
            <RuleText>When the captain does not play, the vice-captain receives the active 3× multiplier. Choose a vice-captain likely to participate.</RuleText>
          </View>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'scoring') ? <RuleSection id="scoring" title="Default fantasy scoring" expanded={isSectionExpanded('scoring')} onToggle={() => toggleSection('scoring')} onLayout={(event) => onSectionLayout('scoring', event)}>
          {scoringRows.map(([event, points, category, detail]) => (
            <View key={event} className="gap-1 border-b border-slate-800 py-3">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-sm font-medium text-slate-50">{event}</Text>
                <Text className={`text-sm font-bold ${points.startsWith('-') ? 'text-red-300' : 'text-emerald-300'}`}>{points}</Text>
              </View>
              <Text className="text-xs text-slate-500">{category} · {detail}</Text>
            </View>
          ))}
          <RuleText>
            Economy and objective categories are role-adjusted and capped as shown. Performance bonuses use the calculated
            performance index, not a ranking percentile. The teamfight proxy uses damage × 0.0004 + healing × 0.0015 +
            tower damage × 0.0008.
          </RuleText>
          <View className="gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <Text className="font-semibold text-cyan-300">Performance Index</Text>
            <RuleText>min(100, max(0, ((Combat + Economy + Objective) ÷ 40) × 100)). The thresholds above use this index, not a leaderboard percentile.</RuleText>
          </View>
          <View className="gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <Text className="font-semibold text-cyan-300">Single-match score calculator</Text>
            <RuleText>Estimate one player’s match score using default values and selected role. Published season rules may differ. This estimate excludes captaincy, bench, chip, and transfer adjustments.</RuleText>
            <View className="flex-row flex-wrap gap-2">
              {roleNames.map((role) => (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  accessibilityState={{ selected: calculatorRole === role }}
                  onPress={() => setCalculatorRole(role)}
                  className={`min-h-10 justify-center rounded-lg border px-3 ${calculatorRole === role ? 'border-cyan-400 bg-cyan-400/15' : 'border-slate-700 bg-slate-900'}`}
                >
                  <Text className={`text-xs font-semibold ${calculatorRole === role ? 'text-cyan-200' : 'text-slate-300'}`}>{role}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2">
              {calculatorFields.map(({ field, label }) => (
                <View key={field} className="min-w-[45%] flex-1 gap-1">
                  <Text className="text-xs text-slate-400">{label}</Text>
                  <TextInput
                    accessibilityLabel={label}
                    keyboardType="decimal-pad"
                    value={calculatorInputs[field]}
                    onChangeText={(text) => setCalculatorInputs((current) => ({ ...current, [field]: text }))}
                    className="min-h-10 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100"
                  />
                </View>
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: teamWon }}
                onPress={() => setTeamWon((current) => !current)}
                className="min-h-10 flex-row items-center rounded-lg border border-slate-700 bg-slate-900 px-3"
              >
                <Text className="text-xs text-slate-200">{teamWon ? '☑' : '□'} Team won map</Text>
              </Pressable>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: seriesClincher, disabled: !teamWon }}
                disabled={!teamWon}
                onPress={() => setSeriesClincher((current) => !current)}
                className="min-h-10 flex-row items-center rounded-lg border border-slate-700 bg-slate-900 px-3"
              >
                <Text className="text-xs text-slate-200">{seriesClincher ? '☑' : '□'} Series clincher</Text>
              </Pressable>
            </View>
            <View className="gap-2">
              <Text className="text-xs text-slate-400">Prior consecutive matches with index ≥80</Text>
              <View className="flex-row gap-2">
                {[0, 1, 2].map((streak) => (
                  <Pressable
                    key={streak}
                    accessibilityRole="button"
                    accessibilityState={{ selected: previousPerformanceStreak === streak }}
                    onPress={() => setPreviousPerformanceStreak(streak)}
                    className={`min-h-9 justify-center rounded-lg border px-3 ${previousPerformanceStreak === streak ? 'border-cyan-400 bg-cyan-400/15' : 'border-slate-700 bg-slate-900'}`}
                  >
                    <Text className="text-xs text-slate-200">{streak === 2 ? '2+' : streak}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-xs leading-5 text-slate-400">Consistency requires two prior qualifying matches plus this match (three consecutive in total).</Text>
            </View>
            <View className="gap-1 rounded-lg bg-slate-950 p-3">
              {scoreEstimate.components.map(([name, points]) => (
                <View key={name} className="flex-row justify-between gap-2">
                  <Text className="text-xs text-slate-400">{name}</Text>
                  <Text className="font-mono text-xs text-slate-200">{points > 0 ? '+' : ''}{points.toFixed(2)}</Text>
                </View>
              ))}
              <View className="mt-1 flex-row justify-between border-t border-slate-800 pt-2">
                <Text className="font-bold text-slate-100">Estimated total</Text>
                <Text className="font-bold text-cyan-200">{scoreEstimate.total.toFixed(2)}</Text>
              </View>
              <Text className="text-xs text-slate-500">Performance Index: {scoreEstimate.performanceIndex.toFixed(1)}</Text>
            </View>
          </View>
          <View className="gap-2 rounded-xl bg-slate-950 p-3">
            <Text className="font-semibold text-slate-100">Default role benchmarks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View className="flex-row border-b border-slate-700 py-2">
                  {['Role', 'GPM', 'XPM', 'LH/min', 'Hero dmg', 'Tower dmg', 'Healing'].map((label) => (
                    <Text key={label} className="w-24 px-1 text-xs font-bold text-slate-400">{label}</Text>
                  ))}
                </View>
                {roleNames.map((role) => (
                  <View key={role} className="flex-row border-b border-slate-800 py-2">
                    <Text className="w-24 px-1 text-xs font-semibold text-slate-200">{role}</Text>
                    <Text className="w-24 px-1 text-xs text-slate-400">{roleBenchmarks[role].gpm}</Text>
                    <Text className="w-24 px-1 text-xs text-slate-400">{roleBenchmarks[role].xpm}</Text>
                    <Text className="w-24 px-1 text-xs text-slate-400">{roleBenchmarks[role].lastHitsPerMinute}</Text>
                    <Text className="w-24 px-1 text-xs text-slate-400">{roleBenchmarks[role].heroDamage.toLocaleString()}</Text>
                    <Text className="w-24 px-1 text-xs text-slate-400">{roleBenchmarks[role].towerDamage.toLocaleString()}</Text>
                    <Text className="w-24 px-1 text-xs text-slate-400">{roleBenchmarks[role].healing.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'chips') ? <RuleSection id="chips" title="Seasonal chips & boosters" expanded={isSectionExpanded('chips')} onToggle={() => toggleSection('chips')} onLayout={(event) => onSectionLayout('chips', event)}>
          <Bullet>Wildcard: once per season; make unlimited transfers for one gameweek without transfer hits.</Bullet>
          <Bullet>Triple Captain: once per season; the selected captain earns 3× points instead of the usual 2×.</Bullet>
          <Bullet>Bench Boost: once per season; all three bench players contribute their points. Bench points are not multiplied; captaincy still follows the captain and vice-captain rules.</Bullet>
          <Bullet>Activate a chip before the upcoming gameweek deadline; chips cannot be applied retroactively.</Bullet>
          <Bullet>Each chip type is tracked independently, so different chip types can be active in the same gameweek.</Bullet>
          <Bullet>Wildcard does not remove role-matching, budget, or squad-size requirements.</Bullet>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'transfers') ? <RuleSection id="transfers" title="Transfers & free allowances" expanded={isSectionExpanded('transfers')} onToggle={() => toggleSection('transfers')} onLayout={(event) => onSectionLayout('transfers', event)}>
          <Bullet>A new season starts with 2 free transfers.</Bullet>
          <Bullet>One additional free transfer is added at each gameweek rollover; unused transfers roll over up to a maximum bank of 2.</Bullet>
          <Bullet>Each transfer beyond the free allowance is recorded as a 4-point hit. The current gameweek score calculation does not subtract this recorded transfer penalty.</Bullet>
          <Bullet>Transfers require equal numbers in and out, enough budget, and exact role-for-role matching. Support and Hard Support are distinct roles.</Bullet>
          <Bullet>Wildcard grants unlimited transfers for its gameweek without transfer hits.</Bullet>
          <RuleText>After a gameweek closes, default player price movement is calculated from fantasy points and ownership:</RuleText>
          <View className="gap-2 rounded-xl bg-slate-950 p-3">
            <Text className="font-mono text-sm leading-6 text-amber-200">
              Movement = (Gameweek points × 0.02) + (ownership fraction × 0.10)
            </Text>
            <RuleText>Movement is capped at ±$0.5M per gameweek. Ownership alone does not lower prices.</RuleText>
            <Text className="text-xs leading-5 text-slate-400">
              Example: 20 points and 60% ownership gives (20 × 0.02) + (0.6 × 0.10) = +$0.46M. A $9.50M base price becomes $9.96M.
            </Text>
          </View>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'deadlines') ? <RuleSection id="deadlines" title="Lock deadlines & lineup validation" expanded={isSectionExpanded('deadlines')} onToggle={() => toggleSection('deadlines')} onLayout={(event) => onSectionLayout('deadlines', event)}>
          <Bullet>Each gameweek has a stored deadline timestamp; it is not recalculated when you open the screen. Check Gameweeks for the authoritative timestamp.</Bullet>
          <Bullet>Lineups and transfers lock after the timestamp or when the gameweek is marked closed, whichever comes first.</Bullet>
          <Bullet>After the deadline, lineup changes, transfers, and chip activation for that gameweek are locked. Unsaved changes are not saved.</Bullet>
          <Bullet>All five starting roles must be filled; bench slots can remain empty.</Bullet>
          <Bullet>Exactly one captain and one different vice-captain must be selected from the starters.</Bullet>
          <Bullet>Every lineup player must belong to the active squad, and a player cannot fill more than one slot.</Bullet>
          <Bullet>Saving again overwrites the manager’s lineup for that gameweek until it locks.</Bullet>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'leagues') ? <RuleSection id="leagues" title="League formats" expanded={isSectionExpanded('leagues')} onToggle={() => toggleSection('leagues')} onLayout={(event) => onSectionLayout('leagues', event)}>
          <View className="gap-2 rounded-xl bg-slate-950 p-3">
            <Text className="font-semibold text-amber-300">Classic leagues</Text>
            <RuleText>Managers rank by cumulative season fantasy points. Each gameweek lineup total contributes to the season total.</RuleText>
          </View>
          <View className="gap-2 rounded-xl bg-slate-950 p-3">
            <Text className="font-semibold text-amber-300">Head-to-head leagues</Text>
            <RuleText>Each gameweek, your lineup total is compared with your scheduled opponent’s. A higher score wins; equal scores are a draw. H2H standings track wins, losses, draws, and points.</RuleText>
          </View>
          <Bullet>Create a league for 4–32 managers (10 by default).</Bullet>
          <Bullet>In an H2H league with an odd number of participants, one manager receives a bye and an automatic win for that round.</Bullet>
          <Bullet>Private leagues can be joined using their invite code. Public and private leagues are available from the Leagues screen.</Bullet>
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'faq') ? <RuleSection id="faq" title="Frequently asked questions" expanded={isSectionExpanded('faq')} onToggle={() => toggleSection('faq')} onLayout={(event) => onSectionLayout('faq', event)}>
          {[
            ['When does my lineup lock?', 'At the gameweek’s stored deadline timestamp, or when that gameweek is marked closed. Check the gameweek countdown for the current time.'],
            ['Can a Support play in the Hard Support slot?', 'Yes. Support and Hard Support players are interchangeable in the two starting slots, but auto-bench substitutions require an exact role match.'],
            ['What happens if no bench player can replace an absent starter?', 'No replacement is made; the absent starter scores zero. The system checks eligible bench players in bench order.'],
            ['Does my vice-captain get the Triple Captain multiplier?', 'Yes, if the captain has no recorded match participation. If neither participates, neither earns points from the captain multiplier.'],
            ['Are extra-transfer hits deducted from my score?', 'The app records a 4-point hit for each transfer beyond your free allowance, but current gameweek score totals do not subtract it.'],
            ['When does the series-win bonus apply?', 'The +3 bonus is awarded only to players on the winning team in the match that clinches a series.'],
          ].map(([question, answer]) => {
            const expanded = expandedFaqs.includes(question);
            return (
              <View key={question} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => toggleFaq(question)}
                  className="min-h-11 flex-row items-center justify-between gap-3"
                >
                  <Text className="flex-1 text-sm font-semibold text-slate-100">{question}</Text>
                  <Text className="text-slate-400">{expanded ? '−' : '+'}</Text>
                </Pressable>
                {expanded ? <RuleText>{answer}</RuleText> : null}
              </View>
            );
          })}
        </RuleSection> : null}

        {visibleSections.some((section) => section.id === 'hood') ? <RuleSection id="hood" title="Under the hood: system mechanics" expanded={isSectionExpanded('hood')} onToggle={() => toggleSection('hood')} onLayout={(event) => onSectionLayout('hood', event)}>
          <RuleText>
            Match data, scoring, gameweek totals, pricing, and standings are processed by recurring background jobs.
            New scores and rankings may take time to appear while match data is ingested and jobs complete.
          </RuleText>
          <View className="gap-2">
            <Text className="text-base font-bold text-slate-50">How a score reaches the standings</Text>
            {[
              ['1 · Match data', 'Completed match stats are ingested.'],
              ['2 · Fantasy score', 'Default or published season rules score each player.'],
              ['3 · Lineup total', 'Starters, captaincy, and active chips are applied.'],
              ['4 · League tables', 'Season points and H2H results are recalculated.'],
              ['5 · Global ranking', 'Managers are ranked by season points.'],
            ].map(([title, detail]) => (
              <View key={title} className="flex-row gap-3 rounded-xl bg-slate-950 p-3">
                <Text className="flex-1 text-xs font-semibold text-violet-200">{title}</Text>
                <Text className="flex-[2] text-xs leading-5 text-slate-400">{detail}</Text>
              </View>
            ))}
          </View>
          <Text className="text-base font-bold text-slate-50">Automated job schedule</Text>
          {jobs.map(([name, description, frequency]) => (
            <View key={name} className="gap-1 border-b border-slate-800 py-2">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="font-semibold text-slate-200">{name}</Text>
                <Text className="text-xs font-semibold text-brand-300">{frequency}</Text>
              </View>
              <Text className="text-xs leading-5 text-slate-400">{description}</Text>
            </View>
          ))}
          <View className="gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
            <Text className="font-semibold text-violet-300">How your total is calculated</Text>
            <RuleText>
              Eligible starter points are summed, captaincy multipliers are applied, and Bench Boost adds bench scores
              without applying a captain multiplier to bench players. If the captain has no recorded participation, the
              vice-captain receives the multiplier. Gameweek totals accumulate into your season total.
            </RuleText>
          </View>
          <View className="gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <Text className="font-semibold text-amber-300">Dynamic player pricing</Text>
            <RuleText>
              Price updates use the closed gameweek’s fantasy points and ownership, with a ±$0.5M movement cap. Repeated
              job runs recalculate from the original gameweek base price rather than stacking additional movements.
            </RuleText>
          </View>
          <View className="gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <Text className="font-semibold text-cyan-300">Automated notifications</Text>
            <RuleText>
              A general reminder is sent when a deadline is within 24 hours; an additional reminder is sent within 2
              hours if your lineup is incomplete. Availability alerts check your squad every 30 minutes. Price-change
              alerts follow significant movements, and rank-change alerts follow recalculation.
            </RuleText>
          </View>
          <Link href="/gameweeks" asChild>
            <Pressable className="min-h-11 justify-center">
              <Text className="font-semibold text-brand-300">View gameweek schedule →</Text>
            </Pressable>
          </Link>
        </RuleSection> : null}
      </ScrollView>
    </Screen>
  );
}
