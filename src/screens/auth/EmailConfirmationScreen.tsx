import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { AuthService } from '../../services/authService';
import { RootStackParamList } from '../../navigation/AppNavigator';

type EmailConfirmationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailConfirmation'
>;
type EmailConfirmationScreenRouteProp = RouteProp<RootStackParamList, 'EmailConfirmation'>;

interface EmailConfirmationScreenProps {
  navigation: EmailConfirmationScreenNavigationProp;
  route: EmailConfirmationScreenRouteProp;
}

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({
  navigation,
  route,
}) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const email = route?.params?.email || '';

  useEffect(() => {
    // Send verification email when screen loads
    sendVerificationEmail();
  }, []);

  const sendVerificationEmail = async () => {
    try {
      await AuthService.sendEmailVerification();
    } catch (error: any) {
      console.error('Error sending verification email:', error);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await AuthService.sendEmailVerification();
      Alert.alert('Email Sent', 'Verification email has been sent. Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setChecking(true);
    try {
      const isVerified = await AuthService.checkEmailVerification();
      if (isVerified) {
        // Navigate to onboarding
        navigation.replace('Onboarding');
      } else {
        Alert.alert(
          'Email Not Verified',
          'Please check your email and click the verification link before continuing.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        {/* Abstract orange shapes */}
        <View style={styles.shape1} />
        <View style={styles.shape2} />
      </View>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={48} color="#FF6B35" />
            </View>
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification email to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <Text style={styles.instructions}>
            Please check your inbox and click the verification link to activate your account.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title="I've Verified My Email"
              onPress={handleContinue}
              loading={checking}
              fullWidth
              variant="secondary"
              style={styles.continueButton}
            />

            <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendLink}>
              <Text style={styles.resendText}>
                Didn't receive the email? <Text style={styles.resendLinkText}>Resend</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    top: -80,
    left: -80,
  },
  shape2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 138, 101, 0.06)',
    bottom: -60,
    right: -60,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  email: {
    fontWeight: '600',
    color: '#FF6B35',
  },
  instructions: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 48,
  },
  buttonContainer: {
    gap: 16,
  },
  continueButton: {
    marginBottom: 8,
  },
  resendLink: {
    alignItems: 'center',
    padding: 8,
  },
  resendText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
  },
  resendLinkText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
  },
});
