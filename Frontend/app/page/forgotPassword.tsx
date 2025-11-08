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
// Import <Link> từ expo-router để quay lại
import { Link } from 'expo-router';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  const handleSendOTP = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email) {
      setErrorMessage('Vui lòng nhập email của bạn.');
      return;
    }

    setIsLoading(true);

    try {
      // GIẢ ĐỊNH: Bạn sẽ cần tạo endpoint này
      // ví dụ: 'http://192.168.1.10:5000/api/auth/forgot-password'
      const response = await fetch('http://YOUR_API_BASE_URL/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Không tìm thấy email hoặc đã có lỗi xảy ra.');
      } else {
        // Gửi thành công
        setSuccessMessage('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra.');
        // TODO: Điều hướng người dùng đến màn hình nhập OTP (ví dụ: /reset-password)
        // Với Expo Router, bạn sẽ dùng: router.push('/reset-password');
        Alert.alert('Kiểm tra Email', 'Mã OTP đã được gửi đến email của bạn.');
      }

    } catch (error) {
      console.error('Lỗi quên mật khẩu:', error);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
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
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Gửi mã OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.backLinkContainer}>
              <Link href="./login" asChild>
                <TouchableOpacity>
                  <Text style={styles.backLink}>Quay lại Đăng nhập</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// --- Styles (Tương tự như các màn hình khác) ---
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
    paddingHorizontal: 20, // p-4 hoặc p-8
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
    backgroundColor: '#991B1B', // bg-red-800
    padding: 12, // p-3
    borderRadius: 8, // rounded-lg
    marginBottom: 16, // space-y-6
  },
  errorText: {
    color: '#FECACA', // text-red-200
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#065F46', // bg-green-800
    padding: 12, // p-3
    borderRadius: 8, // rounded-lg
    marginBottom: 16, // space-y-6
  },
  successText: {
    color: '#D1FAE5', // text-green-100
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16, // space-y-6
  },
  label: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#D1D5DB', // text-gray-300
    marginBottom: 8, // mt-2
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
  button: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8, // rounded-lg
    backgroundColor: '#4F46E5', // bg-indigo-600
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
  },
  buttonDisabled: {
    backgroundColor: '#3730A3', // bg-indigo-800
  },
  buttonText: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#FFFFFF', // text-white
  },
  backLinkContainer: {
    alignItems: 'center',
    marginTop: 24, // mt-6
  },
  backLink: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#818CF8', // text-indigo-400
  },
});

export default ForgotPasswordScreen;