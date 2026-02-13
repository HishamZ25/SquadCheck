import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Camera, X } from 'lucide-react-native';
import { CircleLoader } from '../common/CircleLoader';
import * as ImagePicker from 'expo-image-picker';
import { useColorMode } from '../../theme/ColorModeContext';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

interface CheckInModalBoxProps {
  visible: boolean;
  onClose: () => void;
  challengeTitle: string;
  inputType: 'boolean' | 'number' | 'text' | 'timer';
  unitLabel?: string;
  minValue?: number;
  requireAttachment?: boolean;
  onSubmit: (draft: any) => void;
  submitting: boolean;
}

export const CheckInModalBox: React.FC<CheckInModalBoxProps> = ({
  visible,
  onClose,
  challengeTitle,
  inputType,
  unitLabel,
  minValue,
  requireAttachment,
  onSubmit,
  submitting,
}) => {
  const { colors, mode } = useColorMode();
  const [boolValue, setBoolValue] = useState(false);
  const [numberValue, setNumberValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [hoursValue, setHoursValue] = useState('');
  const [minutesValue, setMinutesValue] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: 'photo'; uri: string }>>([]);

  // Reset form when modal closes (not on submit - so user sees loading state)
  React.useEffect(() => {
    if (!visible) {
      setBoolValue(false);
      setNumberValue('');
      setTextValue('');
      setHoursValue('');
      setMinutesValue('');
      setNotes('');
      setAttachments([]);
    }
  }, [visible]);

  const inputTypeNorm = String(inputType || 'boolean').toLowerCase();

  const isFormValid = (): boolean => {
    switch (inputTypeNorm) {
      case 'boolean':
        return true;
      case 'number': {
        const trimmed = String(numberValue ?? '').trim();
        if (!trimmed) return false;
        return !isNaN(parseFloat(trimmed));
      }
      case 'timer': {
        const h = parseFloat(String(hoursValue ?? '').trim()) || 0;
        const m = parseFloat(String(minutesValue ?? '').trim()) || 0;
        const hasNotes = String(notes ?? '').trim().length > 0;
        return h > 0 || m > 0 || hasNotes;
      }
      case 'text':
        return String(textValue ?? '').trim().length > 0;
      default:
        return true;
    }
  };


  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Camera', onPress: handleCamera },
      { text: 'Gallery', onPress: handleGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachments([{ type: 'photo', uri: result.assets[0].uri }]);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAttachments([{ type: 'photo', uri: result.assets[0].uri }]);
    }
  };

  const handleSubmit = () => {
    if (submitting) return;
    const draft: any = { attachments };

    if (inputTypeNorm === 'boolean') draft.booleanValue = true;
    else if (inputTypeNorm === 'number') draft.numberValue = parseFloat(String(numberValue).trim()) || 0;
    else if (inputTypeNorm === 'text') draft.textValue = (textValue || '').trim();
    else if (inputTypeNorm === 'timer') {
      const hours = parseFloat(String(hoursValue).trim()) || 0;
      const mins = parseFloat(String(minutesValue).trim()) || 0;
      draft.timerSeconds = (hours * 60 + mins) * 60;
    }

    if (notes.trim() && inputTypeNorm !== 'text') {
      draft.textValue = (draft.textValue || '') ? `${draft.textValue}\n${notes.trim()}` : notes.trim();
    }

    onSubmit(draft);
    // Do NOT reset here - parent will close modal on success; reset when modal closes (useEffect below)
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={submitting ? undefined : onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={submitting ? undefined : onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalTouchable}>
          <View style={[styles.container, { backgroundColor: colors.surface }]}>
            {/* Loading overlay when submitting - keeps modal content visible but shows progress */}
            {submitting && (
              <View style={styles.submittingOverlay}>
                <CircleLoader dotColor="#FF6B35" size="large" />
                <Text style={styles.submittingText}>Submitting check-in...</Text>
              </View>
            )}

            {/* Header with challenge title */}
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Check in</Text>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {challengeTitle || 'Challenge'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={submitting} style={styles.closeBtn}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Scrollable content only */}
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Number Input - compact */}
              {inputTypeNorm === 'number' && (
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    {unitLabel || 'Value'}
                  </Text>
                  <TextInput
                    style={[
                      styles.inputCompact,
                      { backgroundColor: mode === 'dark' ? colors.card : '#F5F5F5', color: colors.text },
                    ]}
                    value={numberValue}
                    onChangeText={setNumberValue}
                    keyboardType="decimal-pad"
                    placeholder={minValue ? `Min ${minValue}` : '0'}
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {/* Timer Input - Hours and Minutes */}
              {inputTypeNorm === 'timer' && (
                <View style={styles.timerRow}>
                  <View style={styles.timerField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Hours</Text>
                    <TextInput
                      style={[
                        styles.timerInput,
                        { backgroundColor: mode === 'dark' ? colors.card : '#F5F5F5', color: colors.text },
                      ]}
                      value={hoursValue}
                      onChangeText={setHoursValue}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.timerField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Minutes</Text>
                    <TextInput
                      style={[
                        styles.timerInput,
                        { backgroundColor: mode === 'dark' ? colors.card : '#F5F5F5', color: colors.text },
                      ]}
                      value={minutesValue}
                      onChangeText={setMinutesValue}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              )}

              {/* Text Input */}
              {inputTypeNorm === 'text' && (
                <View style={styles.fieldBlock}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Message</Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      { backgroundColor: mode === 'dark' ? colors.card : '#F5F5F5', color: colors.text },
                    ]}
                    value={textValue}
                    onChangeText={setTextValue}
                    placeholder="Enter your message..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Photo Attachment */}
              {requireAttachment && (
                <View style={styles.fieldBlock}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Photo</Text>
                  {attachments.length > 0 ? (
                    <View style={styles.photoPreview}>
                      <Image source={{ uri: attachments[0].uri }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setAttachments([])}
                      >
                        <X size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.photoButton,
                        {
                          borderColor: colors.accent,
                          backgroundColor: mode === 'dark' ? colors.surface : '#FFF',
                        },
                      ]}
                      onPress={handleAddPhoto}
                    >
                      <Camera size={24} color="#FF6B35" />
                      <Text style={[styles.photoButtonText, { color: colors.accent }]}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Notes */}
              {inputTypeNorm !== 'text' && (
                <View style={styles.fieldBlock}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Notes (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { backgroundColor: mode === 'dark' ? colors.card : '#F5F5F5', color: colors.text },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add a note..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}
            </ScrollView>

            {/* Submit button fixed at bottom with consistent spacing */}
            <View style={[styles.footer, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: submitting ? colors.textSecondary : colors.accent },
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Submitting...' : 'Submit Check-In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalTouchable: {
    width: '100%',
    maxWidth: 400,
    maxHeight: WINDOW_HEIGHT * 0.85,
  },

  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: WINDOW_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  titleWrap: {
    flex: 1,
    marginRight: 8,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  closeBtn: {
    padding: 4,
  },

  scrollContent: {
    flexGrow: 0,
    flexShrink: 1,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  timerRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },

  timerField: {
    flex: 1,
  },

  timerInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },

  fieldBlock: {
    marginBottom: 14,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },

  inputCompact: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    minWidth: 72,
    maxWidth: 100,
    textAlign: 'center',
  },

  textArea: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
    minHeight: 88,
    textAlignVertical: 'top',
  },

  notesInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    minHeight: 56,
    textAlignVertical: 'top',
  },

  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
  },

  photoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },

  photoPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },

  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },

  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#FFF',
  },

  submitButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 16,
  },
  submittingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
