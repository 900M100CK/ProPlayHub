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
// Import <Link> from expo-router for navigation
import { Link } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { authStyles as styles } from '../styles/authStyles'; // Shared auth styles

const LoginScreen: React.FC = () => {
  // --- Pull state and actions from the auth store ---
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
    loadRememberedCredentials,
  } = useAuthStore();

  useEffect(() => {
    loadRememberedCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once when component mounts

  // --- Screen layout ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex} // Shared auth style
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>ProPlayHub</Text>
              <Text style={styles.subtitle}>Welcome back! Sign in to your account.</Text>
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
              <Text style={styles.label}>Password</Text>
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
                  color={rememberMe ? '#A855F7' : '#9CA3AF'}
                />
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>
              {/* Forgot password link */}
              <Link href="./forgotPassword" asChild>
                <TouchableOpacity><Text style={styles.bottomLinkActionText}>Forgot password?</Text></TouchableOpacity>
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
                <Text style={loginStyles.loginButtonText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.bottomLinkContainer}>
              <Text style={styles.bottomLinkText}>Don't have an account? </Text>
              <Link href="./register" asChild>
                <TouchableOpacity>
                  <Text style={styles.bottomLinkActionText}>Create one</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Override a few styles so they align with the shared auth styles
const loginStyles = StyleSheet.create({
  loginButton: {
    ...styles.button,
    marginTop: 0, // Override marginTop from rememberMeContainer
  },
  loginButtonDisabled: styles.buttonDisabled,
  loginButtonText: styles.buttonText,
});

export default LoginScreen;
