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
  ActivityIndicator
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Import <Link> từ expo-router để điều hướng
import { Link } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { authStyles as styles } from '../styles/authStyles'; // Import style chung

const LoginScreen: React.FC = () => {
  // --- Lấy state và actions từ Zustand store ---
  const {
    email,
    password,
    rememberMe,
    isPasswordVisible,
    isLoading,
    errorMessage,
    setEmail,
    setPassword,
    setRememberMe,
    togglePasswordVisibility,
    login,
    loadRememberedEmail,
  } = useAuthStore();

  useEffect(() => {
    loadRememberedEmail();
  }, []);

  // --- Giao diện (UI) cho Subtask 1 ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex} // Sử dụng style từ file chung
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>ProPlayHub</Text>
              <Text style={styles.subtitle}>Chào mừng trở lại! Đăng nhập vào tài khoản của bạn.</Text>
            </View>

            {/* Error Message Display */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email Input */}
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
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="********"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!isPasswordVisible} // Logic show/hide
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                />
                <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                  <Ionicons
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>
            {/* Remember Me Checkbox */}
            <View style={styles.rememberMeContainer}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
                <Ionicons
                  name={rememberMe ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={rememberMe ? '#818CF8' : '#9CA3AF'}
                />
                <Text style={styles.rememberMeText}>Ghi nhớ tôi</Text>
              </TouchableOpacity>
              {/* Link quên mật khẩu được di chuyển vào đây để căn chỉnh tốt hơn */}
              <Link href="./forgotPassword" asChild>
                <TouchableOpacity><Text style={styles.bottomLinkActionText}>Quên mật khẩu?</Text></TouchableOpacity>
              </Link>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[loginStyles.loginButton, isLoading && loginStyles.loginButtonDisabled]}
              onPress={login}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={loginStyles.loginButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Register Link (Thêm mới) */}
            <View style={styles.bottomLinkContainer}>
              <Text style={styles.bottomLinkText}>Chưa có tài khoản? </Text>
              <Link href="./register" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkActionText}>Đăng ký ngay</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Cần đổi tên một số style để khớp với file chung
const loginStyles = StyleSheet.create({
  loginButton: {
    ...styles.button,
    marginTop: 0, // Ghi đè lại marginTop từ rememberMeContainer
  },
  loginButtonDisabled: styles.buttonDisabled,
  loginButtonText: styles.buttonText,
});

export default LoginScreen;