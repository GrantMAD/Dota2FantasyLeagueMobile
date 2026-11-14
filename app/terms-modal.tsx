import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceModal() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft} />
        <Text style={s.headerTitle}>Terms of Service</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close terms of service"
          hitSlop={12}
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge */}
        <View style={s.badge}>
          <Text style={s.badgeText}>📋  Terms of Service</Text>
        </View>

        <Text style={s.title}>Terms of Service</Text>
        <Text style={s.meta}>Last updated: November 14, 2026</Text>

        {/* Fan project notice */}
        <View style={s.callout}>
          <Text style={s.calloutTitle}>⚠️  Independent Fan Project</Text>
          <Text style={s.calloutText}>
            Fantasy Dota 2 is an independent, non-commercial fan project. It is not affiliated with,
            endorsed by, or sponsored by Valve Corporation. Dota 2 and all related marks are
            trademarks of Valve Corporation. All Dota 2 data is sourced from publicly available APIs
            such as OpenDota and Stratz.
          </Text>
        </View>

        {/* Section 1 */}
        <Section title="1. Agreement and Eligibility">
          <P>
            By accessing or using Fantasy Dota 2 (the "Service") you confirm that you are at least
            13 years of age and agree to be bound by these Terms of Service ("Terms"). If you do not
            agree, do not use the Service.
          </P>
          <P>
            We reserve the right to update these Terms at any time. Continued use of the Service
            after changes constitutes your acceptance of the revised Terms.
          </P>
        </Section>

        {/* Section 2 */}
        <Section title="2. Account Responsibility">
          <P>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account. You agree to notify us immediately if
            you suspect unauthorised access to your account.
          </P>
          <P>
            You may not share your account, create accounts for the purpose of manipulation, or use
            automated tools to interact with the Service.
          </P>
        </Section>

        {/* Section 3 */}
        <Section title="3. Fantasy Rules and Deadline Finality">
          <P>
            All transfer deadlines, gameweek lock times, and scoring rules are as published within
            the Service at the time of the action.
          </P>
          <Bullet text="Transfers submitted after a gameweek deadline will not be applied to that gameweek" />
          <Bullet text="Scores are calculated from official match data and are final once published" />
          <Bullet text="In the event of a data error we will correct scores as soon as practicable, but cannot guarantee retroactive adjustments" />
          <P>
            We reserve the right to modify rules, scoring systems, or gameweek structures to reflect
            changes in the official Dota 2 professional scene.
          </P>
        </Section>

        {/* Section 4 */}
        <Section title="4. Leagues">
          <P>
            Fantasy Dota 2 supports both global and private leagues. When you create or join a
            league you agree to participate in good faith and to abide by any additional rules set
            by the league commissioner.
          </P>
          <P>
            We reserve the right to dissolve or reset leagues in exceptional circumstances such as
            data integrity issues or violation of these Terms.
          </P>
        </Section>

        {/* Section 5 */}
        <Section title="5. Intellectual Property">
          <P>
            All original content within the Service — including but not limited to design, code,
            copy, and scoring algorithms — is owned by Fantasy Dota 2 or its contributors and is
            protected by applicable intellectual property laws.
          </P>
          <P>
            Dota 2 hero names, images, and game data remain the property of Valve Corporation and
            are used here under fair use principles for fan and educational purposes.
          </P>
        </Section>

        {/* Section 6 */}
        <Section title="6. Service Availability">
          <P>
            We strive to keep the Service available at all times but cannot guarantee uninterrupted
            access. The Service may be unavailable during maintenance windows, Dota 2 patch cycles,
            or due to circumstances beyond our control.
          </P>
          <P>We reserve the right to modify or discontinue any part of the Service at any time.</P>
        </Section>

        {/* Section 7 */}
        <Section title="7. Limitation of Liability">
          <P>
            Fantasy Dota 2 is provided on an "as is" and "as available" basis without warranties of
            any kind, either express or implied. To the fullest extent permitted by law, we exclude
            all warranties and shall not be liable for any indirect, incidental, special, or
            consequential damages arising from your use of the Service.
          </P>
        </Section>

        {/* Section 8 */}
        <Section title="8. Termination">
          <P>
            We reserve the right to suspend or terminate your account at any time for violation of
            these Terms or for any conduct we deem harmful to the Service or its community. You may
            delete your account at any time by contacting us.
          </P>
        </Section>

        {/* Section 9 */}
        <Section title="9. Changes to Terms">
          <P>
            We may update these Terms from time to time. When we do, we will update the "Last
            updated" date at the top of this document. Your continued use of the Service after any
            change constitutes your acceptance of the new Terms.
          </P>
        </Section>

        {/* Section 10 */}
        <Section title="10. Contact Us">
          <P>
            If you have any questions about these Terms, please contact us at:
          </P>
          <View style={s.contactBox}>
            <Text style={s.contactText}>Fantasy Dota 2</Text>
            <Text style={s.contactText}>legal@fantasydota2.com</Text>
          </View>
        </Section>

        {/* Done button */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Done reading terms of service"
          style={({ pressed }) => [s.doneBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={s.doneBtnText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.para}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)',
    backgroundColor: '#0f172a',
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeBtn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c4b5fd',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 16,
  },
  callout: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fbbf24',
  },
  calloutText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  section: {
    marginTop: 24,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  para: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 13,
    color: '#14b8a6',
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  contactBox: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  contactText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  doneBtn: {
    marginTop: 32,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
