import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColorMode } from '../../theme/ColorModeContext';

const PHOTOS_GAP = 8;
const PHOTOS_PER_ROW = 3;
const getPhotoSize = () => {
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 16 * 2 + 20 * 2; // screen + container padding
  return Math.floor((screenWidth - horizontalPadding - PHOTOS_GAP * (PHOTOS_PER_ROW - 1)) / PHOTOS_PER_ROW);
};

type InputType = "boolean" | "number" | "text" | "timer";

interface CheckInComposerProps {
  inputType: InputType;
  unitLabel?: string;
  minValue?: number;
  requireAttachment?: boolean;
  requireText?: boolean;
  minTextLength?: number;
  onSubmit: (draft: CheckInDraft) => void;
  disabled?: boolean;
  showNotesField?: boolean; // Optional notes field for home screen modal
  isModal?: boolean; // If true, remove container styling (for modal use)
  compact?: boolean; // When true with isModal, use tighter padding for single-screen fit
  showPhotoPicker?: boolean; // When true, show optional photo picker even when requireAttachment is false
  /** Challenge description shown above the photo section */
  description?: string | null;
  /** Challenge requirements/rules shown above the photo section */
  requirements?: string[];
}

export interface CheckInDraft {
  booleanValue?: boolean;
  numberValue?: number;
  textValue?: string;
  timerSeconds?: number;
  attachments?: Array<{ type: "photo"|"screenshot"; uri: string }>;
}

export const CheckInComposer: React.FC<CheckInComposerProps> = ({
  inputType,
  unitLabel,
  minValue,
  requireAttachment,
  requireText,
  minTextLength,
  onSubmit,
  disabled = false,
  showNotesField = false,
  isModal = false,
  compact = false,
  showPhotoPicker = false,
  description,
  requirements = [],
}) => {
  const [boolValue, setBoolValue] = useState(false);
  const [numberValue, setNumberValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [timerValue, setTimerValue] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: "photo"|"screenshot"; uri: string }>>([]);
  const [notes, setNotes] = useState(''); // Separate notes field
  const { colors } = useColorMode();

  const isFormValid = () => {
    // Check main input (boolean has no UI, always valid)
    switch (inputType) {
      case 'boolean':
        return true;
      case 'number':
        const numVal = parseFloat(numberValue);
        if (isNaN(numVal) || (minValue && numVal < minValue)) return false;
        break;
      case 'timer':
        const minutes = parseFloat(timerValue);
        if (isNaN(minutes) || minutes <= 0) return false;
        if (minValue && minutes * 60 < minValue) return false;
        break;
      case 'text':
        if (!textValue.trim()) return false;
        if (minTextLength && textValue.length < minTextLength) return false;
        break;
    }

    // Check required text
    if (requireText && !textValue.trim()) return false;

    // Check required attachments
    if (requireAttachment && attachments.length === 0) return false;

    return true;
  };

  const handleAddAttachment = () => {
    Alert.alert('Add Proof', 'Choose an option', [
      {
        text: 'Camera',
        onPress: handleTakePhoto,
      },
      {
        text: 'Gallery',
        onPress: handlePickImage,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setAttachments([{ type: 'photo', uri: result.assets[0].uri }]);
    }
  };

  const handlePickImage = async () => {
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

    if (!result.canceled && result.assets && result.assets[0]) {
      setAttachments([{ type: 'photo', uri: result.assets[0].uri }]);
    }
  };

  const handleSubmit = () => {
    const draft: CheckInDraft = {};

    // Validate and build draft based on input type
    switch (inputType) {
      case 'boolean':
        draft.booleanValue = true;
        break;

      case 'number':
        const numVal = parseFloat(numberValue);
        if (isNaN(numVal)) {
          Alert.alert('Error', 'Please enter a valid number');
          return;
        }
        if (minValue && numVal < minValue) {
          Alert.alert('Error', `Minimum value is ${minValue}`);
          return;
        }
        draft.numberValue = numVal;
        break;

      case 'timer':
        const minutes = parseFloat(timerValue);
        if (isNaN(minutes) || minutes <= 0) {
          Alert.alert('Error', 'Please enter valid minutes');
          return;
        }
        const seconds = minutes * 60;
        if (minValue && seconds < minValue) {
          Alert.alert('Error', `Minimum time is ${Math.floor(minValue / 60)} minutes`);
          return;
        }
        draft.timerSeconds = seconds;
        break;

      case 'text':
        if (!textValue.trim()) {
          Alert.alert('Error', 'Please enter some text');
          return;
        }
        if (minTextLength && textValue.length < minTextLength) {
          Alert.alert('Error', `Minimum ${minTextLength} characters required`);
          return;
        }
        draft.textValue = textValue;
        break;
    }

    // Check required text
    if (requireText && !textValue.trim()) {
      Alert.alert('Error', 'Additional note is required');
      return;
    }
    if (requireText && textValue.trim()) {
      draft.textValue = textValue;
    }

    // Check attachments
    if (requireAttachment && attachments.length === 0) {
      Alert.alert('Error', 'Photo proof is required');
      return;
    }
    if (attachments.length > 0) {
      draft.attachments = attachments;
    }

    // Optional notes (when showNotesField)
    if (showNotesField && notes.trim()) {
      draft.textValue = (draft.textValue || '').trim()
        ? (draft.textValue + '\n' + notes.trim())
        : notes.trim();
    }

    // Submit
    onSubmit(draft);

    // Reset form
    setBoolValue(false);
    setNumberValue('');
    setTextValue('');
    setTimerValue('');
    setAttachments([]);
    setNotes('');
  };

  if (disabled) {
    return null;
  }

  const showRulesBox = (requireAttachment || showPhotoPicker) && (description || requirements.length > 0);

  return (
    <View style={isModal ? (compact ? styles.modalContainerCompact : styles.modalContainer) : [styles.container, { backgroundColor: colors.surface }]}>
      {/* Rules & requirements - right beneath pending, extends to photo section */}
      {showRulesBox && (
        <View style={[styles.rulesBox, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '99' }]}>
          <View style={styles.rulesSection}>
            <Text style={[styles.rulesTitle, { color: colors.text }]}>Rules & requirements</Text>
            {description ? (
              <Text style={[styles.rulesDescription, { color: colors.textSecondary }]}>{description}</Text>
            ) : null}
            {requirements.length > 0 ? (
              <View style={styles.requirementsList}>
                {requirements.filter(Boolean).map((req, idx) => (
                  <Text key={idx} style={[styles.requirementItem, { color: colors.textSecondary }]}>
                    • {req}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      )}

      {inputType === 'number' && (
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent + '60' }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={numberValue}
            onChangeText={setNumberValue}
            keyboardType="decimal-pad"
            placeholder={minValue ? `Min ${minValue}` : '0'}
            placeholderTextColor={colors.textSecondary}
          />
          {unitLabel && <Text style={[styles.unit, { color: colors.textSecondary }]}>{unitLabel}</Text>}
        </View>
      )}

      {inputType === 'timer' && (
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent + '60' }]}>
          <Ionicons name="timer-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { marginLeft: 8, color: colors.text }]}
            value={timerValue}
            onChangeText={setTimerValue}
            keyboardType="decimal-pad"
            placeholder={minValue ? `Min ${Math.floor(minValue / 60)} min` : '0 min'}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      {inputType === 'text' && (
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.accent + '60' }]}
          value={textValue}
          onChangeText={setTextValue}
          placeholder="Add a note..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      )}

      {/* Attachments - required or optional (showPhotoPicker) */}
      {(requireAttachment || showPhotoPicker) && (
        <>
          {attachments.length > 0 ? (
            <View style={[styles.photoContainer, { width: getPhotoSize(), height: getPhotoSize() }]}>
              <Image source={{ uri: attachments[0].uri }} style={[styles.photo, { width: getPhotoSize(), height: getPhotoSize() }]} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setAttachments([])}
              >
                <Ionicons name="close" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.photoButton, { borderColor: colors.accent }]} onPress={handleAddAttachment}>
              <Ionicons name="camera" size={20} color={colors.accent} />
              <Text style={[styles.photoButtonText, { color: colors.accent }]}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Optional Notes Field */}
      {showNotesField && inputType !== 'text' && (
        <View style={styles.notesSection}>
          {!compact && <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>}
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.accent + '60' }, compact && styles.notesInputCompact]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: colors.accent }, !isFormValid() && [styles.submitButtonDisabled, { backgroundColor: colors.dividerLineTodo + '99' }]]} 
        onPress={handleSubmit}
        disabled={!isFormValid()}
      >
        <Text style={[styles.submitText, !isFormValid() && { color: colors.textSecondary }]}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const SECTION_GAP = 12;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: SECTION_GAP,
    marginBottom: SECTION_GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: SECTION_GAP,
  },

  modalContainer: {
    backgroundColor: 'transparent',
    padding: 24,
    gap: 20,
  },

  modalContainerCompact: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 12,
  },

  notesInputCompact: {
    minHeight: 120,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  label: {
    fontSize: 18,
    fontWeight: '600',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 60,
  },

  input: {
    flex: 1,
    fontSize: 20,
  },

  unit: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },

  textInput: {
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  photosScroll: {
    marginHorizontal: -4,
  },
  photosScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PHOTOS_GAP,
    paddingVertical: 4,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    borderRadius: 12,
  },

  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addMore: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },

  photoButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },

  submitButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  submitButtonDisabled: {
  },

  submitText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },

  submitTextDisabled: {
    color: '#888',
  },

  rulesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 88,
  },
  rulesSection: {
    gap: 6,
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  rulesDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  requirementsList: {
    gap: 2,
  },
  requirementItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesSection: {
    gap: 10,
  },

  notesLabel: {
    fontSize: 18,
    fontWeight: '600',
  },

  notesInput: {
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
