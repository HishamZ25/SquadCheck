import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Theme } from '../../constants/theme';
import { AuthService } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await AuthService.signIn(email, password);
      // Navigation will be handled by the auth state listener
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="people-circle" size={64} color={Theme.colors.secondary} />
          </View>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue with SquadCheck</Text>
        </View>

        <View style={styles.form}>
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

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            variant="secondary"
            style={styles.loginButton}
          />

          <Button
            title="Don't have an account? Sign Up"
            onPress={handleSignUp}
            variant="ghost"
            fullWidth
            style={styles.signUpButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  
  content: {
    flex: 1,
    padding: Theme.layout.screenPadding,
  },
  
  header: {
    alignItems: 'center',
    marginTop: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xl,
  },
  
  logoContainer: {
    marginBottom: Theme.spacing.lg,
  },
  
  title: {
    ...Theme.typography.h1,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  
  subtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
  },
  
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  
  loginButton: {
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  
  signUpButton: {
    marginTop: Theme.spacing.sm,
  },
}); 