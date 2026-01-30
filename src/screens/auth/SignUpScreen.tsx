import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Theme } from '../../constants/theme';
import { AuthService } from '../../services/authService';

interface SignUpScreenProps {
  navigation: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    displayName?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
  }>({});

  const validateForm = () => {
    const newErrors: { 
      displayName?: string; 
      email?: string; 
      password?: string; 
      confirmPassword?: string; 
    } = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const currentUser = await AuthService.signUp(email, password, displayName);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Navigation will be handled automatically by auth state change listener
      // No need to navigate manually - the app will switch to main screens
      Alert.alert(
        'Success!',
        'Account created successfully. You can now create or join accountability groups!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    // Use goBack() to return to Login screen, or replace if we're the initial screen
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If we can't go back, use replace to switch to Login
      navigation.replace('Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#000000" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Ionicons name="people-circle" size={64} color={Theme.colors.secondary} />
          </View>
          <Text style={styles.title}>Join SquadCheck</Text>
          <Text style={styles.subtitle}>Create your account to get started</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Display Name"
            placeholder="Enter your display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoCorrect={false}
            error={errors.displayName}
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            fullWidth
            variant="secondary"
            style={styles.signUpButton}
          />

          <TouchableOpacity onPress={handleSignIn} style={styles.signInLink}>
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLinkText}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
    position: 'relative',
  },
  
  content: {
    flex: 1,
    padding: Theme.layout.screenPadding,
  },
  
  header: {
    alignItems: 'center',
    marginTop: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xl,
    position: 'relative',
  },
  
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: Theme.spacing.sm,
  },
  
  logoContainer: {
    marginBottom: Theme.spacing.lg,
  },
  
  title: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: '#000000',
    fontWeight: '700',
  },
  
  subtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: '#000000',
  },
  
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  
  signUpButton: {
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  
  signInLink: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  signInText: {
    ...Theme.typography.body,
    color: '#000000',
    textAlign: 'center',
  },
  signInLinkText: {
    ...Theme.typography.body,
    color: '#FF6B35',
    fontWeight: '600',
  },
}); 