import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';

const LAST_UPDATED = 'February 22, 2026';

interface SectionCardProps {
  icon: string;
  title: string;
  children: React.ReactNode;
  colors: any;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children, colors }) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '30' }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accent + '18' }]}>
        <Ionicons name={icon as any} size={18} color={colors.accent} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
    </View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

interface BulletProps {
  text: string;
  colors: any;
}

const Bullet: React.FC<BulletProps> = ({ text, colors }) => (
  <View style={styles.bulletRow}>
    <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
    <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
  </View>
);

interface PrivacyScreenProps {
  navigation: any;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
          Last updated: {LAST_UPDATED}
        </Text>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          SquadCheck ("we", "our", or "us") is committed to protecting your
          privacy. This policy explains how we collect, use, and safeguard your
          information.
        </Text>

        {/* 1. Information We Collect */}
        <SectionCard icon="document-text-outline" title="Information We Collect" colors={colors}>
          <Text style={[styles.subTitle, { color: colors.text }]}>Account</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Email address, display name, and optional profile photo.
          </Text>

          <Text style={[styles.subTitle, { color: colors.text }]}>User Content</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Check-in submissions (text, numbers, photos), chat messages, group
            information, challenge data, and gamification progress (XP, levels,
            streaks, and achievements).
          </Text>

          <Text style={[styles.subTitle, { color: colors.text }]}>Device</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Push notification token (if enabled) and your timezone for
            scheduling deadlines.
          </Text>

          <Text style={[styles.subTitle, { color: colors.text }]}>Social</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Friend connections and group memberships.
          </Text>
        </SectionCard>

        {/* 2. How We Use It */}
        <SectionCard icon="settings-outline" title="How We Use Your Information" colors={colors}>
          <Bullet text="Provide, maintain, and improve the App" colors={colors} />
          <Bullet text="Create and manage your account" colors={colors} />
          <Bullet text="Enable group challenges, check-ins, and social features" colors={colors} />
          <Bullet text="Send push notifications you have opted into" colors={colors} />
          <Bullet text="Evaluate challenge progress and determine outcomes" colors={colors} />
          <Bullet text="Track your progress through levels, streaks, and achievements" colors={colors} />
        </SectionCard>

        {/* 3. What We Don't Collect */}
        <SectionCard icon="shield-checkmark-outline" title="What We Don't Collect" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We do not collect your precise location, contacts, health or fitness
            data, financial information, browsing history, or advertising
            identifiers. We do not track you across other apps or websites.
          </Text>
        </SectionCard>

        {/* 4. Third-Party Services */}
        <SectionCard icon="cloud-outline" title="Third-Party Services" colors={colors}>
          <Bullet text="Google Firebase — authentication, data storage, file storage, and serverless functions" colors={colors} />
          <Bullet text="Expo Push Notification Service — push notification delivery" colors={colors} />
          <Text style={[styles.bodySpaced, { color: colors.textSecondary }]}>
            These services have their own privacy policies. Your data is stored
            on Google Cloud servers under Firebase's data processing terms.
          </Text>
        </SectionCard>

        {/* 5. Data Sharing */}
        <SectionCard icon="people-outline" title="Data Sharing" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We do not sell, rent, or trade your personal information. Your data
            is shared only:
          </Text>
          <Bullet text="With group members (display name, check-in activity)" colors={colors} />
          <Bullet text="With service providers listed above, solely to operate the App" colors={colors} />
          <Bullet text="If required by law or to protect our rights" colors={colors} />
        </SectionCard>

        {/* 6. Data Retention */}
        <SectionCard icon="time-outline" title="Data Retention" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We retain your data while your account is active. You can delete your
            account at any time from Settings {'>'} Edit Profile {'>'} Delete Account.
            Upon deletion, your personal data — including gamification data such
            as XP, level, streaks, and achievements — is removed immediately.
            Some group content (e.g., chat messages) may persist in anonymized form.
          </Text>
        </SectionCard>

        {/* 7. Your Rights */}
        <SectionCard icon="hand-left-outline" title="Your Rights" colors={colors}>
          <Bullet text="Access the personal data we hold about you" colors={colors} />
          <Bullet text="Update your display name, profile photo, and title through Edit Profile" colors={colors} />
          <Bullet text="Delete your account and all associated data from Edit Profile" colors={colors} />
          <Bullet text="Leave any group at any time from the group's settings" colors={colors} />
          <Bullet text="Opt out of push notifications at any time" colors={colors} />
          <Bullet text="Request a copy of your data" colors={colors} />
          <Text style={[styles.bodySpaced, { color: colors.textSecondary }]}>
            To request a data export, contact us at the email below.
          </Text>
        </SectionCard>

        {/* 8. Children's Privacy */}
        <SectionCard icon="warning-outline" title="Children's Privacy" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            SquadCheck is not intended for children under 13. We do not knowingly
            collect information from children under 13 and will delete such data
            promptly upon discovery.
          </Text>
        </SectionCard>

        {/* 9. Security */}
        <SectionCard icon="lock-closed-outline" title="Security" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We use industry-standard measures including encrypted data
            transmission (TLS/SSL), Firebase Authentication, and server-side
            security rules. However, no method of electronic storage is 100%
            secure.
          </Text>
        </SectionCard>

        {/* 10. Changes */}
        <SectionCard icon="create-outline" title="Changes to This Policy" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We may update this policy from time to time. Material changes will be
            posted in the App. Continued use after changes constitutes acceptance.
          </Text>
        </SectionCard>

        {/* 11. Contact */}
        <SectionCard icon="mail-outline" title="Contact Us" colors={colors}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Questions about this policy or your data?
          </Text>
          <Text style={[styles.contactEmail, { color: colors.accent }]}>
            support@squadcheck.com
          </Text>
        </SectionCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 48 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  lastUpdated: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardBody: {},
  // Text
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  bodySpaced: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  // Bullet
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
    marginBottom: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  bottomSpacer: { height: 20 },
});
