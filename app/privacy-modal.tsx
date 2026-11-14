import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyModal() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft} />
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close privacy policy"
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
          <Text style={s.badgeText}>📄  Official Legal Policy</Text>
        </View>

        <Text style={s.title}>Privacy Policy</Text>
        <Text style={s.meta}>Last updated: November 14, 2026</Text>

        {/* Valve disclaimer */}
        <View style={s.callout}>
          <Text style={s.calloutTitle}>⚠️  Independent Fan Project</Text>
          <Text style={s.calloutText}>
            Fantasy Dota 2 is an independent fan project and is not affiliated with, endorsed by, or
            sponsored by Valve Corporation. Dota 2 and all related marks are trademarks of Valve
            Corporation.
          </Text>
        </View>

        {/* Section 1 */}
        <Section title="1. Introduction">
          <P>
            Fantasy Dota 2 ("we", "us", or "our") operates the Fantasy Dota 2 mobile application
            and web platform (the "Service"). This Privacy Policy explains what information we
            collect, how we use it, and your rights regarding that information.
          </P>
          <P>
            By using our Service you agree to the collection and use of information in accordance
            with this policy. If you disagree, please do not use our Service.
          </P>
        </Section>

        {/* Section 2 */}
        <Section title="2. Information We Collect">
          <SubSection label="2.1 Account Information">
            <P>
              When you register we collect your email address, chosen username, and a securely
              hashed password. We use this to create and manage your account.
            </P>
          </SubSection>
          <SubSection label="2.2 Fantasy League Data">
            <P>
              We store the fantasy teams, player selections, league memberships, and scores you
              create within the Service.
            </P>
          </SubSection>
          <SubSection label="2.3 Usage Information">
            <P>
              We may collect anonymised analytics data such as feature usage patterns and error
              reports to improve the Service. This data is not linked to your identity.
            </P>
          </SubSection>
          <SubSection label="2.4 Device Information">
            <P>
              We may collect device type, operating system version, and app version to diagnose
              technical issues and ensure compatibility.
            </P>
          </SubSection>
          <SubSection label="2.5 Communications">
            <P>
              If you contact us via email or our in-app report feature, we retain the contents of
              that correspondence to respond to your enquiry.
            </P>
          </SubSection>
        </Section>

        {/* Section 3 */}
        <Section title="3. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <Bullet text="Provide, operate, and maintain the Service" />
          <Bullet text="Create and manage your account" />
          <Bullet text="Process fantasy league actions and calculate scores" />
          <Bullet text="Send important notifications about your account or the Service" />
          <Bullet text="Detect and prevent fraud or abuse" />
          <Bullet text="Improve and develop new features" />
          <Bullet text="Comply with legal obligations" />
        </Section>

        {/* Section 4 */}
        <Section title="4. Cookies and Local Storage">
          <P>
            Our web platform uses browser cookies and localStorage to maintain your session and
            remember your preferences. The mobile app uses secure device storage for the same
            purpose.
          </P>
          <P>
            We do not use tracking cookies or advertising cookies. You can clear stored data at any
            time through your browser or device settings; however, doing so will sign you out.
          </P>
        </Section>

        {/* Section 5 */}
        <Section title="5. Third-Party Service Providers">
          <P>We work with the following third-party providers to operate the Service:</P>
          <Bullet text="Supabase — authentication and database hosting" />
          <Bullet text="OpenDota / Stratz — public Dota 2 match data APIs" />
          <Bullet text="Expo / Apple / Google — mobile app distribution and push notifications" />
          <P>
            Each provider operates under their own privacy policy. We only share the minimum data
            necessary for them to perform their function.
          </P>
        </Section>

        {/* Section 6 */}
        <Section title="6. Data Retention and Your Rights">
          <P>
            We retain your personal data for as long as your account is active. You may request
            deletion of your account and associated data at any time by contacting us at the address
            below.
          </P>
          <P>Depending on your jurisdiction you may also have the right to:</P>
          <Bullet text="Access the personal data we hold about you" />
          <Bullet text="Correct inaccurate data" />
          <Bullet text="Object to or restrict certain processing" />
          <Bullet text="Data portability" />
        </Section>

        {/* Section 7 */}
        <Section title="7. Children's Privacy">
          <P>
            Our Service is not directed to children under 13 years of age. We do not knowingly
            collect personal information from children under 13. If you believe we have
            inadvertently collected such information please contact us and we will delete it
            promptly.
          </P>
        </Section>

        {/* Section 8 */}
        <Section title="8. Contact Us">
          <P>
            If you have any questions about this Privacy Policy or wish to exercise your data
            rights, please contact us at:
          </P>
          <View style={s.contactBox}>
            <Text style={s.contactText}>Fantasy Dota 2</Text>
            <Text style={s.contactText}>privacy@fantasydota2.com</Text>
          </View>
        </Section>

        {/* Done button */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Done reading privacy policy"
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

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.subSection}>
      <Text style={s.subSectionLabel}>{label}</Text>
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
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5eead4',
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
  subSection: {
    marginTop: 8,
    gap: 4,
  },
  subSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
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
