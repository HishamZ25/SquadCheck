import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../../constants/theme';
import { Group } from '../../types';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (caption: string, imageUri: string | null) => void;
  group: Group | null;
}

const { width } = Dimensions.get('window');

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  onClose,
  onSubmit,
  group,
}) => {
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleTakePhoto = async () => {
    if (hasPermission === null) {
      Alert.alert('Camera Permission', 'Requesting camera permission...');
      return;
    }
    
    if (hasPermission === false) {
      Alert.alert('Camera Permission', 'Camera access is required to take photos');
      return;
    }

    setShowCamera(true);
  };

  const handleCameraCapture = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setImageUri(photo.uri);
        setShowCamera(false);
      } else {
        Alert.alert('Error', 'Camera not ready. Please try again.');
      }
    } catch (error) {
      if (__DEV__) console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const handleSubmit = () => {
    if (!caption.trim()) {
      Alert.alert('Error', 'Please add a caption for your check-in');
      return;
    }
    
    onSubmit(caption.trim(), imageUri);
    setCaption('');
    setImageUri(null);
    onClose();
  };

  const handleClose = () => {
    setCaption('');
    setImageUri(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Check In</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            style={[styles.submitButton, !caption.trim() && styles.submitButtonDisabled]}
            disabled={!caption.trim()}
          >
            <Text style={[styles.submitButtonText, !caption.trim() && styles.submitButtonTextDisabled]}>
              Submit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            {imageUri ? (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.image}
                />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color={Theme.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={24} color={Theme.colors.secondary} />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.photoButton} onPress={handlePickFromGallery}>
                  <Ionicons name="images" size={24} color={Theme.colors.secondary} />
                  <Text style={styles.photoButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

                      {/* Group Requirements */}
            {group?.requirements && group.requirements.length > 0 && (
              <View style={styles.requirementsSection}>
                {group.requirements.map((requirement, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <Text style={styles.requirementBullet}>•</Text>
                    <Text style={styles.requirementText}>{requirement}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Caption Input */}
            <View style={styles.captionSection}>
              <Text style={styles.captionLabel}>Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="What did you accomplish today?"
                placeholderTextColor={Theme.colors.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{caption.length}/200</Text>
            </View>
        </View>
      </View>

      {/* Camera Modal */}
      {showCamera && (
        <Modal
          visible={showCamera}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.cameraContainer}>
            <Camera
              style={styles.camera}
              type={CameraType.back}
              ref={cameraRef}
              ratio="16:9"
              autoFocus={true}
              focusable={true}
            >
              {/* Top Close Button */}
              <TouchableOpacity 
                style={styles.cameraTopCloseButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={30} color={Theme.colors.white} />
              </TouchableOpacity>
              
              {/* Bottom Controls */}
              <View style={styles.cameraControls}>
                <View style={styles.cameraLeftPlaceholder} />
                
                <TouchableOpacity 
                  style={styles.captureButton}
                  onPress={handleCameraCapture}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                
                <View style={styles.cameraRightPlaceholder} />
              </View>
            </Camera>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },
  
  closeButton: {
    padding: Theme.spacing.sm,
  },
  
  title: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  
  submitButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  
  submitButtonDisabled: {
    backgroundColor: Theme.colors.gray400,
  },
  
  submitButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.white,
    fontWeight: '600',
  },
  
  submitButtonTextDisabled: {
    color: Theme.colors.textSecondary,
  },
  
  content: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  
  imageSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  photoButton: {
    width: '100%',
    height: 60,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  
  photoButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    fontSize: 14,
    textAlign: 'center',
  },
  
  imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  
  image: {
    width: '100%',
    height: 120,
    borderRadius: Theme.borderRadius.md,
    resizeMode: 'cover',
  },
  
  removeImageButton: {
    position: 'absolute',
    top: Theme.spacing.sm,
    right: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
  },
  
  captionSection: {
    flex: 1,
  },
  
  captionLabel: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  
  captionInput: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    minHeight: 120,
    color: Theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  
  characterCount: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: Theme.spacing.xs,
  },
  
  // Photo Options Styles
  photoOptions: {
    alignItems: 'center',
    width: '100%',
  },
  
  // Requirements Styles
  requirementsSection: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  

  
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  requirementText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  
  requirementBullet: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: 'bold',
    marginRight: Theme.spacing.sm,
  },
  
  // Camera Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: Theme.spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  
  cameraCloseButton: {
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
  },
  
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F0ED',
    borderWidth: 2,
    borderColor: '#000000',
  },
  
  cameraTopCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: Theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    zIndex: 10,
  },
  
  cameraLeftPlaceholder: {
    width: 70,
  },
  
  cameraRightPlaceholder: {
    width: 70,
  },
  

}); 