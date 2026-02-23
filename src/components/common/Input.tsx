import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { useColorMode } from '../../theme/ColorModeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: 'light' | 'dark';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  placeholder?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  placeholder,
  variant = 'light',
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { colors } = useColorMode();

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }, labelStyle]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.textSecondary + '40', color: colors.text },
          isFocused && styles.inputFocused,
          inputStyle,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...textInputProps}
      />
      {error && (
        <Text style={[styles.error, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  error: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
  },
}); 