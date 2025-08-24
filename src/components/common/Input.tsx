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

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
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
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}
      
      <TextInput
        style={[
          styles.input,
          inputStyle,
        ]}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={Theme.colors.textTertiary}
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
    marginBottom: Theme.spacing.md,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  
  input: {
    height: Theme.layout.inputHeight,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.card,
  },
  
  error: {
    fontSize: 12,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
  },
}); 