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
  Alert
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router'; // Dùng Link để quay lại
import { useAuthStore } from '../stores/authStore';
import { authStyles as styles } from '../styles/authStyles'; // Import style chung

// Dựa trên màn hình Login, chúng ta tạo màn hình Register
const RegisterScreen: React.FC = () => {
  const {
    name,
    username,
    email,
    password,
    isPasswordVisible,
    isLoading,
    errorMessage,
    setName,
    setUsername,
    setEmail,
    setPassword,
    togglePasswordVisibility,
    register,
    resetAuthForms,
  } = useAuthStore();

  // Reset form state khi component unmount
  useEffect(() => {
    return () => {
      resetAuthForms();
    };
  }, [resetAuthForms]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            
            <View style={styles.header}>
              <Text style={styles.title}>Tạo tài khoản</Text>
              <Text style={styles.subtitle}>Tham gia ProPlayHub ngay hôm nay.</Text>
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên của bạn</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tên đầy đủ"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

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
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
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

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={register}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Đăng ký</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.bottomLinkContainer}>
              <Text style={styles.bottomLinkText}>Đã có tài khoản? </Text>
              <Link href="./login" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkActionText}>Đăng nhập</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;