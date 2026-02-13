import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useColorMode } from '../../theme/ColorModeContext';

interface CenteredModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  scrollable?: boolean;
}

export const CenteredModal: React.FC<CenteredModalProps> = ({
  visible,
  onClose,
  children,
  size = 'medium',
  scrollable = false,
}) => {
  const { colors } = useColorMode();
  const modalSizeStyle = size === 'small' 
    ? styles.modalSmall 
    : size === 'large' 
    ? styles.modalLarge 
    : styles.modalMedium;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modal, modalSizeStyle, { backgroundColor: colors.surface }]}>
          {scrollable ? (
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalSmall: {
    width: '80%',
    maxWidth: 350,
    maxHeight: '50%',
  },
  modalMedium: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  modalLarge: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '75%',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
