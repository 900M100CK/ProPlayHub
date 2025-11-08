import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Import <Link> từ expo-router để điều hướng
import { Link } from 'expo-router';

// type LoginScreenProps = {
//   navigation: any;
// };

// const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
const LoginScreen: React.FC = () => {

  // --- State cho Subtask 2 ---
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Logic cho Subtask 1 (Show/Hide Password) ---
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // --- Logic cho Subtask 2 (API Call) ---
  const handleLogin = async () => {
    // 1. Xóa trạng thái lỗi trước đó
    setErrorMessage(null);

    // 2. Client-side validation (cơ bản)
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập cả email và mật khẩu.');
      return;
    }

    // 3. Đặt trạng thái đang tải (loading)
    setIsLoading(true);

    // 4. Gửi yêu cầu POST đến API
    try {
      // Thay thế 'YOUR_API_BASE_URL' bằng URL máy chủ của bạn
      // ví dụ: 'http://192.168.1.10:5000/api/auth/login'
      const response = await fetch('http://YOUR_API_BASE_URL/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 5. Xử lý đăng nhập thất bại (400, 401, v.v.)
        setErrorMessage(data.message || 'Email hoặc mật khẩu không hợp lệ.');
      } else {
        // 6. Xử lý đăng nhập thành công
        console.log('Đăng nhập thành công:', data);
        
        // TODO: Lưu trữ token một cách an toàn (sử dụng AsyncStorage hoặc Expo SecureStore)
        // await SecureStore.setItemAsync('sessionToken', data.token);

        // Hiển thị thông báo thành công và điều hướng
        Alert.alert(
          'Đăng nhập thành công!',
          'Chào mừng trở lại!',
          [
            { text: 'OK', onPress: () => {
              // TODO: Điều hướng đến màn hình chính (ví dụ: (tabs) hoặc /home)
              // Với Expo Router, bạn sẽ dùng router.replace('/home');
            }}
          ]
        );
      }

    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      // 7. Bỏ trạng thái đang tải
      setIsLoading(false);
    }
  };

  // --- Giao diện (UI) cho Subtask 1 ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
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

            {/* Forgot Password Link */}
            <View style={styles.forgotPasswordContainer}>
              {/* Dùng <Link> để điều hướng. 'asChild' cho phép lồng TouchableOpacity */}
              <Link href="./forgotPassword" asChild>
                <TouchableOpacity>
                  <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Register Link (Thêm mới) */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Chưa có tài khoản? </Text>
              <Link href="./register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Đăng ký ngay</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// --- StyleSheet (Dịch từ Tailwind CSS) ---
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#111827', // bg-gray-900
    justifyContent: 'center',
  },
  innerContainer: {
    paddingHorizontal: 20, // Tương đương p-4 (hoặc p-8)
  },
  card: { // Nếu bạn muốn có một cái "thẻ" riêng biệt như web
    backgroundColor: '#1F2937', // bg-gray-800
    borderRadius: 16, // rounded-2xl
    padding: 32, // p-8
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24, // mb-6
  },
  title: {
    fontSize: 30, // text-3xl
    fontWeight: 'bold',
    color: '#818CF8', // text-indigo-400
  },
  subtitle: {
    color: '#9CA3AF', // text-gray-400
    marginTop: 8, // mt-2
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#991B1B', // bg-red-800 (hơi đậm, có thể dùng màu sáng hơn)
    padding: 12, // p-3
    borderRadius: 8, // rounded-lg
    borderWidth: 1,
    borderColor: '#F87171', // border-red-700
    marginBottom: 16, // space-y-6
  },
  errorText: {
    color: '#FECACA', // text-red-200
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16, // space-y-6
  },
  label: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#D1D5DB', // text-gray-300
    marginBottom: 8, // mt-2 (từ div)
  },
  input: {
    width: '100%',
    borderRadius: 8, // rounded-lg
    backgroundColor: '#374151', // bg-gray-700
    padding: 12, // p-3
    color: '#FFFFFF', // text-white
    borderWidth: 1,
    borderColor: '#4B5563', // ring-gray-600
    fontSize: 14, // sm:text-sm
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24, // space-y-6
  },
  forgotPasswordText: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#818CF8', // text-indigo-400
  },
  loginButton: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8, // rounded-lg
    backgroundColor: '#4F46E5', // bg-indigo-600
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
  },
  loginButtonDisabled: {
    backgroundColor: '#3730A3', // bg-indigo-800 (hoặc 500)
  },
  loginButtonText: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#FFFFFF', // text-white
  },
  // Styles cho link đăng ký (mới)
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24, // mt-6
  },
  registerText: {
    fontSize: 14, // text-sm
    color: '#9CA3AF', // text-gray-400
  },
  registerLink: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#818CF8', // text-indigo-400
  },
});

export default LoginScreen;