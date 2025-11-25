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
    email: z.string().email({ message: 'Địa chỉ email không hợp lệ.' }),
    otp: z.string().length(6, { message: 'Mã OTP phải có 6 chữ số.' }),
    newPassword: z.string().min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'], // Gán lỗi cho trường confirmPassword
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

  // 2. Hàm xử lý khi nhấn nút "Đặt lại mật khẩu"
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
              <Text style={styles.title}>Đặt lại mật khẩu</Text>
              <Text style={styles.subtitle}>Nhập mã OTP và mật khẩu mới của bạn.</Text>
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
                <TouchableOpacity style={styles.button} onPress={() => router.replace('./login')}>
                  <Text style={styles.buttonText}>Đi đến Đăng nhập</Text>
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
                  <Text style={styles.label}>Mã OTP</Text>
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
                  <Text style={styles.label}>Mật khẩu mới</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, validationErrors.newPassword ? { borderColor: '#EF4444', borderWidth: 1 } : undefined]}
                      value={formState.newPassword}
                      onChangeText={(val) => handleInputChange('newPassword', val)}
                      placeholder="Ít nhất 8 ký tự"
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
                  <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, validationErrors.confirmPassword ? { borderColor: '#EF4444', borderWidth: 1 } : undefined]}
                      value={formState.confirmPassword}
                      onChangeText={(val) => handleInputChange('confirmPassword', val)}
                      placeholder="Nhập lại mật khẩu mới"
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
                    <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.bottomLinkContainer}>
              <Link href="./login" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkActionText}>Quay lại Đăng nhập</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
