import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { authStyles as styles } from '../styles/authStyles';

// Validation schema
const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const {
    email,
    isLoading,
    errorMessage,
    successMessage,
    setEmail,
    sendPasswordResetEmail,
    resetAuthForms,
  } = useAuthStore();

  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form on unmount to avoid stale state
  useEffect(() => {
    return () => {
      resetAuthForms();
    };
  }, [resetAuthForms]);

  const handleSendOTP = async () => {
    setValidationError(null);
    const result = ForgotPasswordSchema.safeParse({ email: email?.trim() || '' });
    if (!result.success) {
      setValidationError(result.error.issues[0].message);
    } else {
      const ok = await sendPasswordResetEmail();
      if (ok && email) {
        router.push({ pathname: './resetPassword', params: { email: email.trim() } });
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>Enter your email to receive an OTP.</Text>
            </View>

            {validationError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            )}

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>

            <View style={styles.bottomLinkContainer}>
              <Link href="./login" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkText}>Back to login</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <View style={styles.bottomLinkContainer}>
              <Link href="./resetPassword" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkActionText}>Enter OTP and reset password</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
