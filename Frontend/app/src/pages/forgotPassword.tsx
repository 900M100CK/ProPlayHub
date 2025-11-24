import React, { useEffect } from 'react';
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
import {SafeAreaView} from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore'; // Import store
import { useState } from 'react';
import { authStyles as styles } from '../styles/authStyles'; // Import style chung

// 1. Định nghĩa schema xác thực với Zod
const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Địa chỉ email không hợp lệ.' }),
});

const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  // Lấy state và actions từ Zustand store
  // errorMessage và successMessage từ store sẽ là lỗi/thành công từ API
  const {
    email,
    isLoading,
    errorMessage,
    successMessage,
    setEmail,
    sendPasswordResetEmail,
    resetAuthForms,
  } = useAuthStore();

  // State cục bộ cho lỗi xác thực phía client
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form khi component unmount để tránh rò rỉ state
  useEffect(() => {
    return () => {
      resetAuthForms();
    };
  }, [resetAuthForms]);

  // 2. HA`m xu? ly� khi nh�n nu�t "Gu?i ma~ OTP"
  const handleSendOTP = async () => {
    setValidationError(null);
    const result = ForgotPasswordSchema.safeParse({ email: email?.trim() || '' });
    if (!result.success) {
      setValidationError(result.error.issues[0].message);
    } else {
      const ok = await sendPasswordResetEmail();
      if (ok) {
        router.push({ pathname: './resetPassword', params: { email: email.trim() } });
      }
    }
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
              <Text style={styles.title}>Quên Mật khẩu</Text>
              <Text style={styles.subtitle}>Nhập email của bạn để nhận mã OTP.</Text>
            </View>

            {validationError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            )}

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Chỉ hiển thị form nếu chưa gửi thành công */}
            {!successMessage && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  disabled={isLoading}
                  onPress={handleSendOTP} // 4. Sử dụng hàm xử lý mới
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Gửi mã OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Link to manually go to reset password screen */}
            {successMessage && (
              <View style={styles.bottomLinkContainer}>
                <TouchableOpacity onPress={() => router.push({ pathname: './resetPassword', params: { email } })}>
                  <Text style={styles.bottomLinkActionText}>Nhập mã OTP và đặt lại mật khẩu</Text>
                </TouchableOpacity>
              </View>
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

export default ForgotPasswordScreen;

