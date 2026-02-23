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
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
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
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

      // Mark as new signup to trigger onboarding flow
      await AsyncStorage.setItem('isNewSignup', 'true');
      
      // Navigate to email confirmation screen
      navigation.navigate('EmailConfirmation', { email });
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
    <View style={styles.container}>
      <View style={styles.background}>
        {/* Abstract orange shapes */}
        <View style={styles.shape1} />
        <View style={styles.shape2} />
        <View style={styles.shape3} />
      </View>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join SquadCheck and start your journey</Text>
            </View>

            <View style={styles.formContainer}>
              <Input
                label="Display Name"
                placeholder="Enter your display name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                error={errors.displayName}
                variant="dark"
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
                variant="dark"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={errors.password}
                variant="dark"
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                error={errors.confirmPassword}
                variant="dark"
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F0ED',
  },
  shape1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    top: 60,
    right: -60,
  },
  shape2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 138, 101, 0.06)',
    bottom: 120,
    left: -50,
  },
  shape3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(229, 90, 43, 0.05)',
    top: '45%',
    left: 30,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 32,
  },
  headerContainer: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    gap: 16,
    marginBottom: 32,
  },
  signUpButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  signInLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
  },
  signInLinkText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
  },
}); 