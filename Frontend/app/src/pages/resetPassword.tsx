import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { authStyles as styles } from '../styles/authStyles';
import { Ionicons } from '@expo/vector-icons';
import { OtpInput } from 'react-native-otp-entry';

// 1. Định nghĩa schema xác thực với Zod
const ResetPasswordSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address.' }),
    otp: z.string().length(6, { message: 'OTP code must be 6 digits.' }),
    newPassword: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Confirmation password does not match.',
    path: ['confirmPassword'],
  });

const ResetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { email: emailFromParams } = useLocalSearchParams<{ email?: string | string[] }>();

  // Lấy state và actions từ Zustand store
  const {
    isLoading,
    errorMessage,
    successMessage,
    resetPasswordWithOTP,
    resetAuthForms,
  } = useAuthStore();

  // State cục bộ cho form
  const [formState, setFormState] = useState({
    email: Array.isArray(emailFromParams) ? (emailFromParams[0] || '') : (emailFromParams || ''),
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [passwordVisibility, setPasswordVisibility] = useState({
    new: false,
    confirm: false,
  });

  // Reset form khi component unmount
  useEffect(() => {
    return () => {
      resetAuthForms();
    };
  }, [resetAuthForms]);

  // 2. Handle password reset submission
  const handleResetPassword = () => {
    setValidationErrors({});

    const result = ResetPasswordSchema.safeParse(formState);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] !== undefined ? String(issue.path[0]) : '_root';
        errors[key] = issue.message;
      });
      setValidationErrors(errors);
    } else {
      resetPasswordWithOTP(formState.email, formState.otp, formState.newPassword);
    }
  };

  const handleInputChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter the OTP and your new password.</Text>
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: '#22C55E',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 24,
                  }}
                >
                  <Ionicons name="checkmark" size={40} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Password has been reset!</Text>
                <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 }}>{successMessage}</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('./login')} >
                  <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>              
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, validationErrors.email ? { borderColor: '#EF4444', borderWidth: 1 } : undefined]}
                    value={formState.email}
                    onChangeText={(val) => handleInputChange('email', val)}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>OTP Code</Text>
                  <OtpInput
                    numberOfDigits={6}
                    onTextChange={(text) => handleInputChange('otp', text)}
                    focusColor="#A855F7"
                    theme={{
                      containerStyle: { width: '100%', marginVertical: 10 },
                      pinCodeContainerStyle: {
                        width: 48,
                        height: 48,
                        backgroundColor: '#374151',
                        borderColor: validationErrors.otp ? '#EF4444' : '#4B5563',
                      },
                      pinCodeTextStyle: { color: '#FFFFFF' },
                    }}
                  />
                  {validationErrors.otp && <Text style={styles.errorText}>{validationErrors.otp}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, validationErrors.newPassword ? { borderColor: '#EF4444', borderWidth: 1 } : undefined]}
                      value={formState.newPassword}
                      onChangeText={(val) => handleInputChange('newPassword', val)}
                      placeholder="At least 8 characters"
                      secureTextEntry={!passwordVisibility.new}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setPasswordVisibility((prev) => ({ ...prev, new: !prev.new }))
                      }
                      style={styles.eyeIcon}
                    >
                      <Ionicons name={passwordVisibility.new ? 'eye-off-outline' : 'eye-outline'} size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  {validationErrors.newPassword && <Text style={styles.errorText}>{validationErrors.newPassword}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, validationErrors.confirmPassword ? { borderColor: '#EF4444', borderWidth: 1 } : undefined]}
                      value={formState.confirmPassword}
                      onChangeText={(val) => handleInputChange('confirmPassword', val)}
                      placeholder="Re-enter new password"
                      secureTextEntry={!passwordVisibility.confirm}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setPasswordVisibility((prev) => ({ ...prev, confirm: !prev.confirm }))
                      }
                      style={styles.eyeIcon}
                    >
                      <Ionicons name={passwordVisibility.confirm ? 'eye-off-outline' : 'eye-outline'} size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  {validationErrors.confirmPassword && <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  disabled={isLoading}
                  onPress={handleResetPassword}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Chỉ hiển thị nút quay lại ở đây nếu form đang hiển thị */}
            {!successMessage && (
              <View style={styles.bottomLinkContainer}>
                <Link href="./login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.bottomLinkActionText}>Back to Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
