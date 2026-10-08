import { Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/src/components/ScreenScrollView';
import { Link } from 'expo-router';
import { Screen } from '@/src/components/Screen';

const scoringRows = [
  ['Kill', '+1.5', 'Combat'],
  ['Assist', '+0.75', 'Combat'],
  ['Death', '-1.0', 'Combat'],
  ['KDA bonus (KDA ≥ 5.0)', '+2.0', 'Combat'],
  ['KDA bonus (KDA ≥ 3.0)', '+1.0', 'Combat'],
  ['GPM', 'Up to +7.5', 'Role-adjusted economy'],
  ['XPM', 'Up to +6.0', 'Role-adjusted economy'],
  ['Last hits', 'Up to +2.6', 'Role-adjusted economy'],
  ['Denies', '+0.1 each', 'Economy'],
  ['Hero damage', 'Up to +6.0', 'Role-adjusted objective'],
  ['Tower damage', 'Up to +3.0', 'Role-adjusted objective'],
  ['Healing', 'Up to +4.5', 'Role-adjusted objective'],
  ['Wards placed', '+0.5 each', 'Objective'],
  ['Wards destroyed', '+0.3 each', 'Objective'],
  ['Roshan kill', '+2.0 each', 'Objective'],
  ['Game win', '+5.0', 'Match result'],
  ['Performance index ≥ 90', '+5.0', 'Role execution'],
  ['Performance index ≥ 80', '+3.0', 'Role execution'],
  ['Performance index ≥ 70', '+1.0', 'Role execution'],
];

function RuleSection({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View className="gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-xl font-bold text-white">{title}</Text>
      {children}
    </View>
  );
}

function RuleText({ children }: React.PropsWithChildren) {
  return <Text className="text-sm leading-6 text-slate-300">{children}</Text>;
}

function Bullet({ children }: React.PropsWithChildren) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-cyan-300">•</Text>
      <Text className="flex-1 text-sm leading-6 text-slate-300">{children}</Text>
    </View>
  );
}

export default function RulesScreen() {
  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-8 pt-5">
        <View>
          <Link href="/learn">
            <Text className="font-semibold text-cyan-300">‹ Learn hub</Text>
          </Link>
          <Text className="mt-3 text-sm font-semibold uppercase tracking-[3px] text-brand-400">Official reference</Text>
          <Text className="mt-2 text-3xl font-bold text-white">Rules & scoring</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-400">
            Current default scoring is summarized below. Published scoring rules for your season take precedence.
          </Text>
        </View>

        <RuleSection title="Squad structure">
          <View className="flex-row flex-wrap gap-2">
            {[
              ['Budget', '$100.0M'],
              ['Squad', '8 players'],
              ['Starting lineup', '5 roles'],
              ['Optional bench', 'Up to 3'],
            ].map(([label, value]) => (
              <View key={label} className="min-w-[45%] flex-1 rounded-xl bg-slate-950 p-3">
                <Text className="text-xs text-slate-500">{label}</Text>
                <Text className="mt-1 font-bold text-white">{value}</Text>
              </View>
            ))}
          </View>
          <RuleText>
            Fill one starting slot for Carry, Mid, Offlane, Support, and Hard Support. Bench slots are optional. A maximum
            of three owned players may come from the same professional team; duplicate players are not allowed.
          </RuleText>
          <RuleText>
            Auto-bench substitutes only for an absent starter when the bench player played that gameweek and has the
            exact same role. Bench priority is Bench 1, then Bench 2, then Bench 3; each bench player can substitute once.
          </RuleText>
        </RuleSection>

        <RuleSection title="Captain & vice-captain">
          <Bullet>Choose exactly one captain and one different vice-captain from the five starters before the deadline.</Bullet>
          <Bullet>The captain receives a 2× multiplier.</Bullet>
          <Bullet>If the captain has no recorded match participation, the vice-captain receives the captain multiplier.</Bullet>
          <Bullet>With Triple Captain active, the captain multiplier is 3× and the vice-captain fallback also receives 3×.</Bullet>
        </RuleSection>

        <RuleSection title="Default fantasy scoring">
          {scoringRows.map(([event, points, category]) => (
            <View key={event} className="flex-row items-center justify-between gap-3 border-b border-slate-800 py-2">
              <View className="flex-1">
                <Text className="text-sm font-medium text-white">{event}</Text>
                <Text className="text-xs text-slate-500">{category}</Text>
              </View>
              <Text className={`text-sm font-bold ${points.startsWith('-') ? 'text-red-300' : 'text-emerald-300'}`}>
                {points}
              </Text>
            </View>
          ))}
          <RuleText>
            Economy and objective categories are role-adjusted and capped as shown. Performance bonuses use the calculated
            performance index, not a ranking percentile.
          </RuleText>
        </RuleSection>

        <RuleSection title="Special chips">
          <Bullet>Wildcard: once per season; unlimited transfers for one gameweek without transfer hits.</Bullet>
          <Bullet>Triple Captain: once per season; captain multiplier becomes 3×.</Bullet>
          <Bullet>Bench Boost: once per season; selected bench players contribute to the gameweek total.</Bullet>
          <Bullet>Activate before the upcoming gameweek deadline; chips cannot be applied retroactively.</Bullet>
          <Bullet>
            The current app permits different chip types to be activated for the same gameweek; it does not enforce a
            no-stacking rule.
          </Bullet>
          <Bullet>Wildcard does not remove role-matching, budget, or squad-size requirements.</Bullet>
        </RuleSection>

        <RuleSection title="Transfers & player prices">
          <Bullet>A new season starts with 2 free transfers.</Bullet>
          <Bullet>One additional free transfer is added at each gameweek rollover; unused transfers roll over up to a maximum bank of 2.</Bullet>
          <Bullet>Each transfer beyond the free allowance is recorded as a 4-point hit. The current gameweek total does not yet subtract recorded transfer hits.</Bullet>
          <Bullet>Transfers require equal numbers in and out, enough budget, and exact role-for-role matching. Support and Hard Support are distinct transfer roles.</Bullet>
          <Bullet>Wildcard grants unlimited transfers for its gameweek without transfer hits.</Bullet>
          <RuleText>After a gameweek closes, default price movement is based on recent points and ownership:</RuleText>
          <View className="rounded-xl bg-slate-950 p-3">
            <Text className="font-mono text-sm leading-6 text-amber-200">
              Movement = (Gameweek points × 0.02) + (ownership fraction × 0.10)
            </Text>
            <Text className="mt-1 text-xs text-slate-400">Per-gameweek movement is capped at ±$0.5M; ownership alone does not lower prices.</Text>
          </View>
        </RuleSection>

        <RuleSection title="Deadlines & lineup validation">
          <Bullet>Each gameweek has its own deadline timestamp; check the Gameweeks screen for the authoritative time.</Bullet>
          <Bullet>After the deadline, lineup changes, transfers, and chip activation for that gameweek are locked. Unsaved lineup changes are not saved.</Bullet>
          <Bullet>All five starting roles must be filled; bench slots can remain empty.</Bullet>
          <Bullet>Exactly one captain and one different vice-captain must be selected from the starters.</Bullet>
          <Bullet>Every lineup player must belong to the active squad, and a player cannot fill more than one slot.</Bullet>
          <Bullet>Saving again overwrites the manager’s lineup for that gameweek until it locks.</Bullet>
        </RuleSection>

        <RuleSection title="Scoring & standings">
          <Bullet>Starter scores are summed; captaincy multipliers are applied, and Bench Boost adds selected bench scores.</Bullet>
          <Bullet>When the captain has no recorded participation, the vice-captain fallback receives the multiplier instead.</Bullet>
          <Bullet>Gameweek points accumulate into the fantasy season total; global and league standings are recalculated after scoring and may lag.</Bullet>
        </RuleSection>
      </ScrollView>
    </Screen>
  );
}
