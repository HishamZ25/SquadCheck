import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';

// -----------------------------------------------------------------------
// FAQ data
// -----------------------------------------------------------------------

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_SECTIONS: { title: string; icon: string; items: FAQItem[] }[] = [
  {
    title: 'Getting Started',
    icon: 'rocket-outline',
    items: [
      {
        question: 'What is SquadCheck?',
        answer:
          'SquadCheck is an accountability app that helps you and your friends stay on track with your goals. Create challenges, check in daily or weekly, and hold each other accountable.',
      },
      {
        question: 'How do I create a group?',
        answer:
          'Tap the Social tab, then tap "Create Group." Give your group a name and invite friends by searching for their username or email.',
      },
      {
        question: 'How do I create a challenge?',
        answer:
          'From the Home screen, tap the "+" button and select a challenge type. You can create Standard, Elimination, Progress, or Deadline challenges. Choose a group to attach it to, set the cadence (daily or weekly), and configure the check-in requirements.',
      },
    ],
  },
  {
    title: 'Challenges & Check-ins',
    icon: 'checkmark-circle-outline',
    items: [
      {
        question: 'What are the different challenge types?',
        answer:
          'Standard — simple daily/weekly check-ins.\nElimination — miss a check-in and you get a strike. Too many strikes and you\'re out. Last one standing wins.\nProgress — targets increase over time (e.g., run further each week).\nDeadline — reach a goal by a specific date.',
      },
      {
        question: 'What happens if I miss a check-in?',
        answer:
          'For Standard challenges, a missed check-in is recorded but nothing else happens. For Elimination challenges, you receive a strike. If your strikes exceed the allowed amount, you\'re eliminated from the challenge.',
      },
      {
        question: 'Can I check in late?',
        answer:
          'If the challenge admin enabled late check-ins, you have a grace period after the deadline. Otherwise, the check-in window closes at the due time.',
      },
      {
        question: 'When is the check-in deadline?',
        answer:
          'The deadline is set by the challenge creator and displayed on the challenge card. It\'s based on the admin\'s timezone when the challenge was created.',
      },
    ],
  },
  {
    title: 'Groups & Social',
    icon: 'people-outline',
    items: [
      {
        question: 'How do I add friends?',
        answer:
          'Go to the Social tab and tap "Add Friend." Search by display name or email address. The other person will receive a friend request they can accept or decline.',
      },
      {
        question: 'How do I invite someone to a group?',
        answer:
          'Open the group chat, tap the settings icon, and select "Invite Members." You can invite any of your friends who aren\'t already in the group.',
      },
      {
        question: 'Can I leave a group?',
        answer:
          'Yes. Open the group chat, tap the Settings tab, and scroll to the bottom. Tap "Leave Group" and confirm. Note that leaving a group will remove you from all active challenges within that group.',
      },
    ],
  },
  {
    title: 'Levels & Rewards',
    icon: 'trophy-outline',
    items: [
      {
        question: 'How does the leveling system work?',
        answer:
          'You earn XP for each check-in (10 XP base + bonuses for streaks and on-time submissions). There are 50 levels across 10 title tiers — from Rookie to Legend. You can view all levels and your progress from Settings by tapping your level card.',
      },
      {
        question: 'What are streaks?',
        answer:
          'Streaks track your consecutive check-ins. The longer your streak, the more bonus XP you earn per check-in. Milestones at 7, 14, 30, 60, and 100 days award extra bonus XP.',
      },
      {
        question: 'What are shields?',
        answer:
          'You earn a shield for every 7-day streak. Shields protect you against a missed check-in in elimination challenges — instead of receiving a strike, a shield is consumed.',
      },
      {
        question: 'What are achievements?',
        answer:
          'Achievements are unlocked by reaching milestones like total check-ins, streak lengths, and levels reached. View your achievements from the Social tab.',
      },
    ],
  },
  {
    title: 'Notifications',
    icon: 'notifications-outline',
    items: [
      {
        question: 'How do I manage notifications?',
        answer:
          'Go to Settings > Notifications. You can toggle each notification type on or off individually — check-in reminders, chat messages, eliminations, invites, and daily digest.',
      },
      {
        question: 'I\'m not receiving notifications',
        answer:
          'Make sure notifications are enabled both in the app (Settings > Notifications) and in your device settings (Settings > SquadCheck > Notifications). On Android, check that the app isn\'t being battery-optimized.',
      },
    ],
  },
  {
    title: 'Account & Privacy',
    icon: 'person-outline',
    items: [
      {
        question: 'How do I change my display name or photo?',
        answer:
          'Go to Settings > Edit Profile. You can update your display name, customize your avatar, and choose a title. Tap "Save changes" when you\'re done.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Settings > Edit Profile and scroll to the bottom. Tap "Delete Account." You\'ll be asked to confirm. This permanently deletes your account, profile, and all associated data.',
      },
      {
        question: 'Is my data secure?',
        answer:
          'Yes. We use Firebase Authentication for secure sign-in, all data is transmitted over TLS/SSL encryption, and server-side security rules ensure users can only access data they\'re authorized to see. See our Privacy Policy for full details.',
      },
    ],
  },
];

// -----------------------------------------------------------------------
// Accordion component
// -----------------------------------------------------------------------

interface AccordionItemProps {
  question: string;
  answer: string;
  colors: any;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ question, answer, colors }) => {
  const [open, setOpen] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setOpen(!open)}
      style={[
        styles.accordionItem,
        { borderBottomColor: colors.dividerLineTodo + '25' },
      ]}
    >
      <View style={styles.questionRow}>
        <Text style={[styles.questionText, { color: colors.text }]}>{question}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </View>
      {open && (
        <Text style={[styles.answerText, { color: colors.textSecondary }]}>
          {answer}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------
// Main screen
// -----------------------------------------------------------------------

interface HelpSupportScreenProps {
  navigation: any;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@squadcheck.com?subject=SquadCheck%20Support');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact card */}
        <TouchableOpacity
          style={[styles.contactCard, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}
          onPress={handleEmailSupport}
          activeOpacity={0.7}
        >
          <View style={[styles.contactIconWrap, { backgroundColor: colors.accent + '25' }]}>
            <Ionicons name="mail-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.contactTextWrap}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>Need help?</Text>
            <Text style={[styles.contactSub, { color: colors.textSecondary }]}>
              Reach out at support@squadcheck.com
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.accent} />
        </TouchableOpacity>

        {/* App info */}
        <View style={[styles.infoRow, { borderColor: colors.dividerLineTodo + '30' }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Version</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
        </View>

        {/* FAQ sections */}
        <Text style={[styles.faqHeading, { color: colors.text }]}>
          Frequently Asked Questions
        </Text>

        {FAQ_SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '30' }]}
          >
            <View style={styles.faqCardHeader}>
              <View style={[styles.faqIconWrap, { backgroundColor: colors.accent + '18' }]}>
                <Ionicons name={section.icon as any} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.faqSectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
            </View>

            {section.items.map((item, idx) => (
              <AccordionItem
                key={idx}
                question={item.question}
                answer={item.answer}
                colors={colors}
              />
            ))}
          </View>
        ))}

        {/* Bottom tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '30' }]}>
          <View style={styles.faqCardHeader}>
            <View style={[styles.faqIconWrap, { backgroundColor: colors.accent + '18' }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.faqSectionTitle, { color: colors.text }]}>Quick Tips</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Set a daily reminder so you never miss a check-in
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Start with a Standard challenge before trying Elimination
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Use the group chat to encourage your friends
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Check the Calendar tab to see your check-in history at a glance
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Build streaks for bonus XP — the longer your streak, the more you earn
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-done" size={16} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Check in early for an on-time bonus (+5 XP)
            </Text>
          </View>
        </View>

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
  // Contact card
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextWrap: { flex: 1 },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  contactSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  // FAQ
  faqHeading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  faqCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  faqIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  // Accordion
  accordionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  // Tips
  tipsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  bottomSpacer: { height: 20 },
});
