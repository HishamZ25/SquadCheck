import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
}) => {
  const [boolValue, setBoolValue] = useState(false);
  const [numberValue, setNumberValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [timerValue, setTimerValue] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: "photo"|"screenshot"; uri: string }>>([]);

  const isFormValid = () => {
    // Check main input
    switch (inputType) {
      case 'boolean':
        if (!boolValue) return false;
        break;
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
      setAttachments([...attachments, { type: 'photo', uri: result.assets[0].uri }]);
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
      setAttachments([...attachments, { type: 'photo', uri: result.assets[0].uri }]);
    }
  };

  const handleSubmit = () => {
    const draft: CheckInDraft = {};

    // Validate and build draft based on input type
    switch (inputType) {
      case 'boolean':
        if (!boolValue) {
          Alert.alert('Error', 'Please confirm completion');
          return;
        }
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

    // Submit
    onSubmit(draft);

    // Reset form
    setBoolValue(false);
    setNumberValue('');
    setTextValue('');
    setTimerValue('');
    setAttachments([]);
  };

  if (disabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Main Input */}
      {inputType === 'boolean' && (
        <View style={styles.row}>
          <Text style={styles.label}>Complete</Text>
          <Switch
            value={boolValue}
            onValueChange={setBoolValue}
            trackColor={{ false: '#E0E0E0', true: '#FF6B35' }}
            thumbColor="#FFF"
          />
        </View>
      )}

      {inputType === 'number' && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={numberValue}
            onChangeText={setNumberValue}
            keyboardType="decimal-pad"
            placeholder={minValue ? `Min ${minValue}` : '0'}
            placeholderTextColor="#999"
          />
          {unitLabel && <Text style={styles.unit}>{unitLabel}</Text>}
        </View>
      )}

      {inputType === 'timer' && (
        <View style={styles.inputRow}>
          <Ionicons name="timer-outline" size={20} color="#666" />
          <TextInput
            style={[styles.input, { marginLeft: 8 }]}
            value={timerValue}
            onChangeText={setTimerValue}
            keyboardType="decimal-pad"
            placeholder={minValue ? `Min ${Math.floor(minValue / 60)} min` : '0 min'}
            placeholderTextColor="#999"
          />
        </View>
      )}

      {inputType === 'text' && (
        <TextInput
          style={styles.textInput}
          value={textValue}
          onChangeText={setTextValue}
          placeholder="Add a note..."
          placeholderTextColor="#999"
          multiline
        />
      )}

      {/* Attachments */}
      {requireAttachment && (
        <>
          {attachments.length > 0 && (
            <View style={styles.photos}>
              {attachments.map((att, idx) => (
                <View key={idx} style={styles.photoContainer}>
                  <Image source={{ uri: att.uri }} style={styles.photo} />
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  >
                    <Ionicons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addMore} onPress={handleAddAttachment}>
                <Ionicons name="add" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {attachments.length === 0 && (
            <TouchableOpacity style={styles.photoButton} onPress={handleAddAttachment}>
              <Ionicons name="camera" size={20} color="#FF6B35" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Submit */}
      <TouchableOpacity 
        style={[styles.submitButton, !isFormValid() && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={!isFormValid()}
      >
        <Text style={[styles.submitText, !isFormValid() && styles.submitTextDisabled]}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  label: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },

  unit: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
  },

  textInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  photoContainer: {
    position: 'relative',
  },

  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },

  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addMore: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },

  photoButtonText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },

  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },

  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  submitTextDisabled: {
    color: '#888',
  },
});
