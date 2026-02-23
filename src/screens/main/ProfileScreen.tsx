import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { CenteredModal } from '../../components/common/CenteredModal';
import { Theme } from '../../constants/theme';
import { useColorMode } from '../../theme/ColorModeContext';
import { User } from '../../types';
import { CommonActions } from '@react-navigation/native';
import { AuthService } from '../../services/authService';
import { useCurrentUser } from '../../contexts/UserContext';
import {
  generateCustomAvatarUrl,
  DICEBEAR_STYLES,
  DICEBEAR_BACKGROUNDS,
  type DicebearStyle,
} from '../../services/dicebearService';

const PROFILE_TITLES = [
  'Accountability Seeker',
  'Fitness Enthusiast',
  'Sleep Improver',
  'Habit Builder',
  'Goal Getter',
  'Morning Person',
  'Mindfulness Seeker',
  'Health Champion',
  'Consistency King',
  'Streak Keeper',
];

interface ProfileScreenProps {
  navigation: any;
  route: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const { user: contextUser, refreshUser } = useCurrentUser();
  const initialUser: User = route.params?.user ?? contextUser ?? ({} as User);
  const [user, setUser] = useState<User>(initialUser);
  const { colors } = useColorMode();

  // Keep local user in sync with context when context refreshes (e.g. after saving avatar)
  React.useEffect(() => {
    if (contextUser && contextUser.id === user?.id) {
      setUser(contextUser);
    }
  }, [contextUser?.id, contextUser?.photoURL, contextUser?.title]);

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<DicebearStyle>('avataaars');
  const [avatarBgIndex, setAvatarBgIndex] = useState(0);
  const [seedOverride, setSeedOverride] = useState<string | null>(null);
  const [useSavedAsPreview, setUseSavedAsPreview] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [titleDropdownVisible, setTitleDropdownVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(initialUser?.displayName || '');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const customAvatarUrl = useMemo(() => {
    const seed = seedOverride ?? user?.displayName ?? user?.email ?? 'user';
    const bg = DICEBEAR_BACKGROUNDS[avatarBgIndex];
    return generateCustomAvatarUrl(seed, 400, avatarStyle, bg);
  }, [seedOverride, user?.displayName, user?.email, avatarStyle, avatarBgIndex]);

  const displayPreviewUrl = (useSavedAsPreview && user?.photoURL) ? user.photoURL : customAvatarUrl;

  const handleRandomizeAvatar = () => {
    setUseSavedAsPreview(false);
    setSeedOverride('r-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
  };

  const handleUseMyName = () => {
    setSeedOverride(null);
    setUseSavedAsPreview(false);
  };

  const handleCloseAvatarModal = () => {
    setSeedOverride(null);
    setUseSavedAsPreview(true);
    setAvatarModalVisible(false);
  };

  const handleStyleOrBackgroundChange = () => {
    setUseSavedAsPreview(false);
  };

  const handleBack = () => navigation.goBack();

  const selectedTitle = user?.title || PROFILE_TITLES[0];

  // Combine default titles with unlocked gamification titles
  const unlockedGamificationTitles = (user?.unlockedTitles || [])
    .map((t) => t.text)
    .filter((t) => !PROFILE_TITLES.includes(t));
  const allTitles = [...PROFILE_TITLES, ...unlockedGamificationTitles];

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    const trimmedName = editDisplayName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      await AuthService.updateProfile({ displayName: trimmedName, title: selectedTitle });
      setUser((prev) => (prev ? { ...prev, displayName: trimmedName, title: selectedTitle } : prev));
      await refreshUser();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you wish to delete your account? This will delete your account and all associated challenges and progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await AuthService.deleteAccount();
              const rootNavigation = navigation.getParent() || navigation;
              rootNavigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                }),
              );
            } catch (e: any) {
              setDeletingAccount(false);
              Alert.alert('Error', e?.message || 'Failed to delete account. You may need to log in again before deleting.');
            }
          },
        },
      ],
    );
  };

  const handleSaveCustomAvatar = async () => {
    if (!user?.id) return;
    if (useSavedAsPreview && user?.photoURL) {
      handleCloseAvatarModal();
      return;
    }
    setSavingAvatar(true);
    try {
      await AuthService.updateProfile({ photoURL: customAvatarUrl });
      setUser((prev) => ({ ...prev, photoURL: customAvatarUrl }));
      await refreshUser();
      handleCloseAvatarModal();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update avatar');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleResetPassword = () => {
    const email = user?.email;
    if (!email) {
      Alert.alert('Error', 'No email on file.');
      return;
    }
    Alert.alert(
      'Reset password',
      `We'll send a password reset link to ${email}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            setSendingReset(true);
            try {
              await AuthService.sendPasswordResetEmail(email);
              Alert.alert(
                'Check your email',
                "We've sent a password reset link to your email. Check your inbox and follow the link to set a new password."
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to send reset email');
            } finally {
              setSendingReset(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <Avatar
            source={user?.photoURL}
            initials={user?.displayName?.charAt(0)}
            size="xl"
          />
          <TouchableOpacity
            style={[styles.changePhotoButton, { backgroundColor: colors.accent }]}
            onPress={() => setAvatarModalVisible(true)}
          >
            <Text style={styles.changePhotoText}>Customize avatar</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
          <Input
            label="Display name"
            value={editDisplayName}
            onChangeText={setEditDisplayName}
            placeholder="Your name"
            containerStyle={styles.input}
          />
          <Input
            label="Email"
            value={user?.email || ''}
            onChangeText={() => {}}
            placeholder="Email"
            keyboardType="email-address"
            editable={false}
            containerStyle={styles.input}
          />
          <View style={styles.input}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TouchableOpacity
              style={[styles.titleDropdown, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}
              onPress={() => setTitleDropdownVisible(!titleDropdownVisible)}
            >
              <Text style={[styles.titleDropdownText, { color: colors.text }]} numberOfLines={1}>
                {selectedTitle}
              </Text>
              <Ionicons
                name={titleDropdownVisible ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {titleDropdownVisible && (
              <ScrollView
                style={[styles.titleDropdownMenu, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {allTitles.map((title) => {
                  const isUnlocked = unlockedGamificationTitles.includes(title);
                  return (
                    <TouchableOpacity
                      key={title}
                      style={[
                        styles.titleDropdownItem,
                        { borderBottomColor: colors.dividerLineTodo + '40' },
                        selectedTitle === title && { backgroundColor: colors.card },
                      ]}
                      onPress={() => {
                        setUser((prev) => (prev ? { ...prev, title } : prev));
                        setTitleDropdownVisible(false);
                      }}
                    >
                      <View style={styles.titleItemRow}>
                        <Text style={[styles.titleDropdownItemText, { color: colors.text }]}>{title}</Text>
                        {isUnlocked && (
                          <View style={[styles.titleUnlockedBadge, { backgroundColor: colors.accent + '20' }]}>
                            <Ionicons name="trophy" size={12} color={colors.accent} />
                          </View>
                        )}
                      </View>
                      {selectedTitle === title && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={handleResetPassword}
          disabled={sendingReset}
        >
          <Ionicons name="key-outline" size={22} color={colors.accent} />
          <Text style={[styles.actionCardText, { color: colors.text }]}>Reset password</Text>
          {sendingReset ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Ionicons name="trophy-outline" size={22} color="#F59E0B" />
          <Text style={[styles.actionCardText, { color: colors.text }]}>Achievements</Text>
          <View style={[styles.achievementCountBadge, { backgroundColor: '#F59E0B' + '20' }]}>
            <Text style={styles.achievementCountText}>
              {(user?.badges || []).length}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#F44336" />
          ) : (
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CenteredModal
        visible={avatarModalVisible}
        onClose={handleCloseAvatarModal}
        size="large"
        scrollable
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Customize avatar</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Choose a style and background. Randomize or use your name for a different look.
          </Text>

          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
            <Avatar source={displayPreviewUrl} initials={user?.displayName?.charAt(0)} size="xl" />
            <View style={styles.randomizeRow}>
              <TouchableOpacity
                style={[styles.randomizeButton, { backgroundColor: colors.background, borderColor: colors.dividerLineTodo + '80' }]}
                onPress={handleRandomizeAvatar}
              >
                <Ionicons name="shuffle" size={18} color={colors.accent} />
                <Text style={[styles.randomizeButtonText, { color: colors.text }]}>Randomize</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUseMyName} style={styles.useNameLink}>
                <Text style={[styles.useNameLinkText, { color: colors.accent }]}>Use my name</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Style</Text>
          <View style={[styles.styleRow, { justifyContent: 'center' }]}>
            {DICEBEAR_STYLES.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => { setAvatarStyle(s.id); handleStyleOrBackgroundChange(); }}
                style={[
                  styles.styleChip,
                  { borderColor: colors.dividerLineTodo + '80', backgroundColor: colors.card },
                  avatarStyle === s.id && [styles.styleChipActive, { borderColor: colors.accent, backgroundColor: colors.accent + '20' }],
                ]}
              >
                <Text style={[styles.styleChipText, { color: colors.text }]} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Background</Text>
          <View style={styles.bgRow}>
            {DICEBEAR_BACKGROUNDS.map((hex, i) => (
              <TouchableOpacity
                key={hex}
                onPress={() => { setAvatarBgIndex(i); handleStyleOrBackgroundChange(); }}
                style={[
                  styles.bgChip,
                  { backgroundColor: '#' + hex },
                  avatarBgIndex === i && [styles.bgChipActive, { borderColor: colors.accent }],
                ]}
              />
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '80' }]}
              onPress={handleCloseAvatarModal}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: colors.accent }]}
              onPress={handleSaveCustomAvatar}
              disabled={savingAvatar}
            >
              {savingAvatar ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalButtonTextWhite}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CenteredModal>
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
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  changePhotoButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  changePhotoText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  formSection: {
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    padding: Theme.spacing.md,
    marginBottom: 16,
  },
  input: { marginBottom: Theme.spacing.sm },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  titleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
  },
  titleDropdownText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  titleDropdownMenu: {
    marginTop: 4,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    maxHeight: 220,
  },
  titleDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  titleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  titleUnlockedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleDropdownItemText: {
    fontSize: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  actionCardText: { flex: 1, fontSize: 16, fontWeight: '600' },
  achievementCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
    marginRight: 4,
  },
  achievementCountText: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  saveButton: { paddingVertical: 14, borderRadius: Theme.borderRadius.md, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  deleteAccountButton: {
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  deleteAccountText: { color: '#F44336', fontSize: 16, fontWeight: '600' },

  modalContent: {
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: Theme.spacing.lg,
    lineHeight: 20,
  },
  previewCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
  },
  randomizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  randomizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
  },
  randomizeButtonText: { fontSize: 14, fontWeight: '600' },
  useNameLink: { paddingVertical: 8, paddingHorizontal: 4 },
  useNameLinkText: { fontSize: 14, fontWeight: '600' },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
    alignSelf: 'center',
  },
  styleChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  styleChipActive: { borderWidth: 2 },
  styleChipText: { fontSize: 12, fontWeight: '600' },
  bgRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  bgChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgChipActive: { borderWidth: 2 },
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonSave: {
    borderWidth: 0,
  },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
  modalButtonTextWhite: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
