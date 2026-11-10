import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent, type ScrollView as ScrollViewRef } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const ruleSections = [
  { id: 'squad', label: 'Squad', icon: '👥' },
  { id: 'captain', label: 'Captaincy', icon: '👑' },
  { id: 'scoring', label: 'Scoring', icon: '📊' },
  { id: 'chips', label: 'Chips', icon: '✨' },
  { id: 'transfers', label: 'Transfers', icon: '🔁' },
  { id: 'deadlines', label: 'Deadlines', icon: '⏱️' },
  { id: 'hood', label: 'Under the Hood', icon: '⚙️' },
] as const;

type RuleSectionId = (typeof ruleSections)[number]['id'];

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
  ['Series win', '+3.0', 'Series', 'Awarded for the series-clinching game'],
  ['Performance index (≥ 90)', '+5.0', 'Role execution', 'Tier 1 performance mastery'],
  ['Performance index (≥ 80)', '+3.0', 'Role execution', 'Tier 2 performance excellence'],
  ['Performance index (≥ 70)', '+1.0', 'Role execution', 'Tier 3 performance consistency'],
  ['Consistency bonus', '+1.0', 'Consistency', 'Three consecutive matches with index ≥ 80'],
];

const jobs = [
  ['Roster changes', 'Detects overnight player team transfers', 'Daily · 2:00 UTC'],
  ['Player sync', 'Refreshes the professional player database', 'Daily · 3:00 UTC'],
  ['Team sync', 'Refreshes professional team rosters', 'Daily · 3:15 UTC'],
  ['Tournament discovery', 'Finds and registers active tournaments', 'Every 6 hours'],
  ['Match fetch', 'Pulls new scheduled and live matches', 'Every hour'],
  ['Match details', 'Ingests per-player match statistics', 'Every 30 minutes'],
  ['Process completed', 'Locks finished matches ready for scoring', 'Every 45 minutes'],
  ['Score calculation', 'Calculates fantasy score breakdowns', 'Recurring schedule'],
  ['Gameweek recalculation', 'Updates gameweek totals and standings', 'Recurring schedule'],
  ['Price updates', 'Recalculates player prices', 'Every 10 minutes'],
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
  const sectionParam = Array.isArray(params.section) ? params.section[0] : params.section;
  const selectedSection = ruleSections.find((section) => section.id === sectionParam)?.id;
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
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {ruleSections.map((section) => (
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

        <RuleSection id="squad" title="Squad structure" expanded={expandedSections.includes('squad')} onToggle={() => toggleSection('squad')} onLayout={(event) => onSectionLayout('squad', event)}>
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
            Fill one starting slot for Carry, Mid, Offlane, Support, and Hard Support. Bench slots are optional. A maximum
            of three owned players may come from the same professional team; duplicate players are not allowed.
          </RuleText>
          <View className="gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <Text className="font-semibold text-cyan-300">Auto-bench replacement order</Text>
            <RuleText>
              If a starter does not play, the system checks Bench 1, then Bench 2, then Bench 3. A substitute must have
              played in that gameweek, match the absent starter’s exact role, and can replace only one starter.
            </RuleText>
          </View>
        </RuleSection>

        <RuleSection id="captain" title="Captaincy & vice-captain" expanded={expandedSections.includes('captain')} onToggle={() => toggleSection('captain')} onLayout={(event) => onSectionLayout('captain', event)}>
          <Bullet>Choose one captain and a different vice-captain from the five starters before the deadline.</Bullet>
          <Bullet>The captain receives a 2× multiplier.</Bullet>
          <Bullet>If the captain has no recorded match participation, the vice-captain receives the captain multiplier.</Bullet>
          <Bullet>With Triple Captain active, the captain multiplier is 3× and the vice-captain fallback also receives 3×.</Bullet>
          <View className="rounded-xl bg-slate-950 p-3">
            <Text className="font-semibold text-amber-300">Triple Captain fallback</Text>
            <RuleText>When the captain does not play, the vice-captain receives the active 3× multiplier. Choose a vice-captain likely to participate.</RuleText>
          </View>
        </RuleSection>

        <RuleSection id="scoring" title="Default fantasy scoring" expanded={expandedSections.includes('scoring')} onToggle={() => toggleSection('scoring')} onLayout={(event) => onSectionLayout('scoring', event)}>
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
        </RuleSection>

        <RuleSection id="chips" title="Seasonal chips & boosters" expanded={expandedSections.includes('chips')} onToggle={() => toggleSection('chips')} onLayout={(event) => onSectionLayout('chips', event)}>
          <Bullet>Wildcard: once per season; make unlimited transfers for one gameweek without transfer hits.</Bullet>
          <Bullet>Triple Captain: once per season; the selected captain earns 3× points instead of the usual 2×.</Bullet>
          <Bullet>Bench Boost: once per season; selected bench players contribute their points to the gameweek total.</Bullet>
          <Bullet>Activate a chip before the upcoming gameweek deadline; chips cannot be applied retroactively.</Bullet>
          <Bullet>Each chip type is tracked independently, so different chip types can be active in the same gameweek.</Bullet>
          <Bullet>Wildcard does not remove role-matching, budget, or squad-size requirements.</Bullet>
        </RuleSection>

        <RuleSection id="transfers" title="Transfers & free allowances" expanded={expandedSections.includes('transfers')} onToggle={() => toggleSection('transfers')} onLayout={(event) => onSectionLayout('transfers', event)}>
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
        </RuleSection>

        <RuleSection id="deadlines" title="Lock deadlines & lineup validation" expanded={expandedSections.includes('deadlines')} onToggle={() => toggleSection('deadlines')} onLayout={(event) => onSectionLayout('deadlines', event)}>
          <Bullet>The lock is set for 30 minutes before the first scheduled fixture in the gameweek. Check Gameweeks for the authoritative timestamp.</Bullet>
          <Bullet>Deadlines are enforced by the backend; changes attempted after the timestamp are rejected.</Bullet>
          <Bullet>After the deadline, lineup changes, transfers, and chip activation for that gameweek are locked. Unsaved changes are not saved.</Bullet>
          <Bullet>All five starting roles must be filled; bench slots can remain empty.</Bullet>
          <Bullet>Exactly one captain and one different vice-captain must be selected from the starters.</Bullet>
          <Bullet>Every lineup player must belong to the active squad, and a player cannot fill more than one slot.</Bullet>
          <Bullet>Saving again overwrites the manager’s lineup for that gameweek until it locks.</Bullet>
        </RuleSection>

        <RuleSection id="hood" title="Under the hood: system mechanics" expanded={expandedSections.includes('hood')} onToggle={() => toggleSection('hood')} onLayout={(event) => onSectionLayout('hood', event)}>
          <RuleText>
            Match data, scoring, gameweek totals, pricing, and standings are processed by recurring background jobs.
            New scores and rankings may take time to appear while match data is ingested and jobs complete.
          </RuleText>
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
              Eligible starter points are summed, captaincy multipliers are applied, and Bench Boost adds selected bench
              scores. If the captain has no recorded participation, the vice-captain receives the multiplier. Gameweek
              totals accumulate into your season total; global and league rankings refresh separately and may lag.
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
              Deadline alerts are sent before a gameweek locks. Price-change alerts follow significant player price
              movements, and rank-change alerts follow recalculation of global or league standings.
            </RuleText>
          </View>
          <Link href="/gameweeks" asChild>
            <Pressable className="min-h-11 justify-center">
              <Text className="font-semibold text-brand-300">View gameweek schedule →</Text>
            </Pressable>
          </Link>
        </RuleSection>
      </ScrollView>
    </Screen>
  );
}
