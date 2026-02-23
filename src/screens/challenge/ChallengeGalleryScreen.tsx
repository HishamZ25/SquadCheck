import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';
import { CheckInService } from '../../services/checkInService';
import { Avatar } from '../../components/common/Avatar';
import { CircleLoader } from '../../components/common/CircleLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 4;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

interface PhotoItem {
  uri: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: Date;
  checkInId: string;
}

interface MemberOption {
  id: string;
  name: string;
}

export const ChallengeGalleryScreen = ({ navigation, route }: any) => {
  const { colors } = useColorMode();
  const { challengeId, memberProfiles, memberIds } = route.params || {};

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const memberOptions: MemberOption[] = [
    { id: 'all', name: 'All Members' },
    ...(memberIds || []).map((id: string) => ({
      id,
      name: memberProfiles?.[id]?.name || 'Unknown',
    })),
  ];

  const selectedMemberName =
    memberOptions.find((o) => o.id === selectedMember)?.name || 'All Members';

  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const checkIns = await CheckInService.getChallengeCheckIns([challengeId]);
        const items: PhotoItem[] = [];

        for (const ci of checkIns) {
          const attachments = (ci as any).attachments as
            | Array<{ type: string; uri?: string; downloadUrl?: string }>
            | undefined;
          if (!attachments?.length) continue;

          for (const a of attachments) {
            const photoUri = a.uri || a.downloadUrl;
            if (!photoUri) continue;

            const profile = memberProfiles?.[ci.userId];
            const createdAt =
              ci.createdAt instanceof Date
                ? ci.createdAt
                : typeof ci.createdAt === 'number'
                  ? new Date(ci.createdAt)
                  : (ci.createdAt as any)?.toMillis
                    ? new Date((ci.createdAt as any).toMillis())
                    : new Date(ci.createdAt as any);

            items.push({
              uri: photoUri,
              userId: ci.userId,
              userName: profile?.name || 'Unknown',
              userAvatar: profile?.avatarUri,
              createdAt,
              checkInId: ci.id,
            });
          }
        }

        if (!cancelled) setPhotos(items);
      } catch (e) {
        if (__DEV__) console.error('Error loading gallery:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  const filteredPhotos =
    selectedMember === 'all'
      ? photos
      : photos.filter((p) => p.userId === selectedMember);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const renderTile = ({ item }: { item: PhotoItem }) => (
    <TouchableOpacity
      style={styles.tile}
      activeOpacity={0.8}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.tileImage} />
      <View style={[styles.tileOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
        <Avatar source={item.userAvatar} initials={item.userName?.charAt(0)} size="sm" style={styles.tileAvatar} />
        <Text style={styles.tileUserName} numberOfLines={1}>
          {item.userName}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Gallery</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <CircleLoader dotColor={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gallery</Text>
        <View style={styles.backButton} />
      </View>

      {/* Member filter dropdown */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]} numberOfLines={1}>
            {selectedMemberName}
          </Text>
          <Ionicons
            name={showDropdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showDropdown && (
          <View
            style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {memberOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.dividerLineTodo + '40' },
                    selectedMember === option.id && [styles.dropdownItemSelected, { backgroundColor: colors.card }],
                  ]}
                  onPress={() => {
                    setSelectedMember(option.id);
                    setShowDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      { color: colors.text },
                      selectedMember === option.id && [styles.dropdownItemTextSelected, { color: colors.accent }],
                    ]}
                  >
                    {option.name}
                  </Text>
                  {selectedMember === option.id && (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Gallery grid or empty state */}
      {filteredPhotos.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No photos yet</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPhotos}
          renderItem={renderTile}
          keyExtractor={(item, index) => `${item.checkInId}-${index}`}
          numColumns={3}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Full-screen photo modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPhoto(null)}>
          <SafeAreaView style={styles.modalContainer} pointerEvents="box-none">
            {/* Close button — high zIndex + hitSlop for reliable taps */}
            <Pressable
              style={styles.modalClose}
              onPress={() => setSelectedPhoto(null)}
              hitSlop={16}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </Pressable>

            {/* Photo — stop background press from closing when tapping the image */}
            {selectedPhoto && (
              <Pressable onPress={(e) => e.stopPropagation()}>
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
                {/* Info bar */}
                <View style={styles.modalInfo}>
                  <Avatar
                    source={selectedPhoto.userAvatar}
                    initials={selectedPhoto.userName?.charAt(0)}
                    size="sm"
                  />
                  <View style={styles.modalInfoText}>
                    <Text style={styles.modalUserName}>{selectedPhoto.userName}</Text>
                    <Text style={styles.modalDate}>{formatDate(selectedPhoto.createdAt)}</Text>
                  </View>
                </View>
              </Pressable>
            )}
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    zIndex: 1000,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemSelected: {},
  dropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 40,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginRight: GRID_GAP,
    marginBottom: GRID_GAP,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  tileAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  tileUserName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    elevation: 100,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalInfoText: {
    marginLeft: 10,
  },
  modalUserName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
});
