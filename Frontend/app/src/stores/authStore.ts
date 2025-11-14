import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import apiClient from '../api/axiosConfig'; // Import apiClient đã cấu hình
import axios from 'axios'; // Vẫn giữ để dùng isAxiosError
import { z } from 'zod';

// 1. Định nghĩa Schemas xác thực với Zod
const LoginSchema = z.object({
  email: z.email({ message: 'Địa chỉ email không hợp lệ.' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' }),
});

const RegisterSchema = z.object({
  name: z.string().min(1, { message: 'Tên không được để trống.' }),
  username: z.string().min(3, { message: 'Username phải có ít nhất 3 ký tự.' }),
  email: z.email({ message: 'Địa chỉ email không hợp lệ.' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' }),
});

// Thêm schema cho Quên mật khẩu
const ForgotPasswordSchema = z.object({
  email: z.email({ message: 'Địa chỉ email không hợp lệ.' }),
});

// Định nghĩa kiểu dữ liệu cho User dựa trên API response
type User = {
  _id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  age?: number;
  location?: string;
  gamingPlatformPreferences?: string[];
};

type AuthState = {
  name: string;
  username: string;
  email: string;
  password: string;
  rememberMe: boolean;
  isPasswordVisible: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null; // Thêm state cho thông báo thành công
  user: User | null;
  accessToken: string | null;
  setName: (name: string) => void;
  setUsername: (username: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setRememberMe: (remember: boolean) => void;
  togglePasswordVisibility: () => void;
  loadRememberedEmail: () => Promise<void>;
  login: () => Promise<void>;
  register: () => Promise<void>;
  sendPasswordResetEmail: () => Promise<void>; // Thêm action mới
  resetAuthForms: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // --- Initial State ---
  name: '',
  username: '',
  email: '',
  password: '',
  rememberMe: false,
  isPasswordVisible: false,
  isLoading: false,
  errorMessage: null,
  successMessage: null,
  user: null,
  accessToken: null,

  // --- Actions ---
  setName: (name) => set({ name }),
  setUsername: (username) => set({ username }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setRememberMe: (remember) => set({ rememberMe: remember }),
  togglePasswordVisibility: () => set((state) => ({ isPasswordVisible: !state.isPasswordVisible })),
  resetAuthForms: () => set({
    name: '', username: '', email: '', password: '', successMessage: null,
    errorMessage: null, isLoading: false
  }),

  loadRememberedEmail: async () => {
    try {
      const rememberedEmail = await AsyncStorage.getItem('rememberedEmail');
      if (rememberedEmail !== null) {
        set({ email: rememberedEmail, rememberMe: true });
      }
    } catch (e) {
      console.error('Failed to load remembered email.', e);
    }
  },

  login: async () => {
    const { email, password, rememberMe } = get();
    
    // 1. Reset error and start loading
    set({ errorMessage: null });

    // 2. Client-side validation với Zod
    const validationResult = LoginSchema.safeParse({ email, password });

    if (!validationResult.success) {
      // Lấy lỗi đầu tiên từ Zod và hiển thị
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError });
      return;
    }

    // Bắt đầu loading sau khi validation thành công
    set({ isLoading: true });

    // 3. API Call với dữ liệu đã được xác thực
    try {
      // Sử dụng axios.post
      const response = await apiClient.post(
        '/auth/login',
        { loginIdentifier: validationResult.data.email, password: validationResult.data.password }
      );

      const data = response.data;

      // 4. Handle success (axios sẽ tự động vào catch nếu status không phải 2xx)
      console.log('Đăng nhập thành công:', data);
      
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email);
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
      }

      // Lưu accessToken và user info vào state
      // TODO: Để bảo mật hơn, accessToken nên được lưu vào SecureStore
      set({ user: data.user, accessToken: data.accessToken, errorMessage: null });

      // --- ĐIỀU HƯỚNG THÔNG MINH ---
      const profileIsComplete = 
        data.user.age && 
        data.user.location && 
        data.user.gamingPlatformPreferences && 
        data.user.gamingPlatformPreferences.length > 0;

      // Nếu email đã xác thực nhưng hồ sơ chưa hoàn chỉnh -> điều hướng đến trang complete-profile
      const redirectTo = (data.user.isEmailVerified && !profileIsComplete) ? './complete-profile' : '../(tabs)/home';

      Alert.alert('Đăng nhập thành công!', 'Chào mừng trở lại!', [
        { text: 'OK', onPress: () => router.replace(redirectTo) }
      ]);
      
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      if (axios.isAxiosError(error) && error.response) {
        // Lấy lỗi từ server
        set({ errorMessage: error.response.data.message || 'Email hoặc mật khẩu không hợp lệ.' });
      } else {
        // Lỗi mạng hoặc lỗi không xác định
        set({ errorMessage: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' });
      }
    } finally {
      // 5. Stop loading
      set({ isLoading: false });
    }
  },

  register: async () => {
    const { name, username, email, password } = get();

    // 1. Reset error
    set({ errorMessage: null });

    // 2. Client-side validation với Zod
    const validationResult = RegisterSchema.safeParse({ name, username, email, password });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError });
      return;
    }

    // Bắt đầu loading sau khi validation thành công
    set({ isLoading: true });

    // 3. API Call
    try {
      const response = await apiClient.post('/auth/register', validationResult.data);

      // 4. Handle success
      console.log('Đăng ký thành công:', response.data);
      Alert.alert(
        'Đăng ký thành công!',
        'Chúng tôi đã gửi một liên kết xác thực đến email của bạn. Vui lòng kiểm tra hộp thư đến.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('./login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      if (axios.isAxiosError(error) && error.response) {
        set({ errorMessage: error.response.data.message || 'Đăng ký thất bại. Vui lòng thử lại.' });
      } else {
        set({ errorMessage: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' });
      }
    } finally {
      // 5. Stop loading
      set({ isLoading: false });
    }
  },

  sendPasswordResetEmail: async () => {
    const { email } = get();

    // 1. Reset messages
    set({ errorMessage: null, successMessage: null });

    // 2. Client-side validation với Zod
    const validationResult = ForgotPasswordSchema.safeParse({ email });
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError });
      return;
    }

    // 3. Bắt đầu loading
    set({ isLoading: true });

    // 4. API Call
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: validationResult.data.email });

      // 5. Xử lý thành công
      set({ successMessage: response.data.message || 'Một email hướng dẫn đã được gửi đến bạn. Vui lòng kiểm tra.' });
      Alert.alert('Kiểm tra Email', 'Một email với hướng dẫn đặt lại mật khẩu đã được gửi cho bạn.', [
        { text: 'OK', onPress: () => router.push({ pathname: './reset-password', params: { email } }) }
      ]);

    } catch (error) {
      console.error('Lỗi quên mật khẩu:', error);
      if (axios.isAxiosError(error) && error.response) {
        set({ errorMessage: error.response.data.message || 'Không tìm thấy email hoặc đã có lỗi xảy ra.' });
      } else {
        set({ errorMessage: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' });
      }
    } finally {
      // 6. Dừng loading
      set({ isLoading: false });
    }
  },
}));
export default useAuthStore;
