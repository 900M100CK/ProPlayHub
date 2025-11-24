import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import apiClient, { setApiToken } from '../api/axiosConfig'; // Use the preconfigured apiClient
import axios from 'axios'; // Keep axios for isAxiosError checks
import { z } from 'zod';
import { showGlobalToast } from '../components/toastService';

// 1. Define validation schemas with Zod
const LoginSchema = z.object({
  email: z.email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const RegisterSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }),
  email: z.email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

// Forgot-password schema
const ForgotPasswordSchema = z.object({
  email: z.email({ message: 'Invalid email address.' }),
});

// Describe the User type based on the API response
type User = {
  _id: string;
  email: string;
  name: string;
  username?: string;
  displayName?: string;
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
  successMessage: string | null; // Store success notifications
  user: User | null;
  accessToken: string | null;
  setName: (name: string) => void;
  setUsername: (username: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setRememberMe: (remember: boolean) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  togglePasswordVisibility: () => void;
  loadRememberedCredentials: () => Promise<void>; // Load stored email/password
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>; // Logout action
  sendPasswordResetEmail: () => Promise<boolean>; // Forgot-password action
  resetPasswordWithOTP: (email: string, otp: string, newPassword: string) => Promise<void>;
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
  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  togglePasswordVisibility: () => set((state) => ({ isPasswordVisible: !state.isPasswordVisible })),
  resetAuthForms: () => set({
    name: '', username: '', email: '', password: '', successMessage: null,
    errorMessage: null, isLoading: false
  }),

  loadRememberedCredentials: async () => {
    try {
      const rememberedEmail = await AsyncStorage.getItem('rememberedEmail');
      const rememberedPassword = await AsyncStorage.getItem('rememberedPassword');
      
      if (rememberedEmail !== null && rememberedPassword !== null) {
        set({ 
          email: rememberedEmail, 
          password: rememberedPassword,
          rememberMe: true 
        });
      } else if (rememberedEmail !== null) {
        // Only an email was stored (legacy behavior)
        set({ email: rememberedEmail, rememberMe: true });
      }
    } catch (e) {
      console.error('Failed to load remembered credentials.', e);
    }
  },

  login: async () => {
    const { email, password, rememberMe } = get();
    
    // 1. Reset error and start loading
    set({ errorMessage: null });

    // 2. Client-side validation with Zod
    const validationResult = LoginSchema.safeParse({ email, password });

    if (!validationResult.success) {
      // Surface the first validation error coming from Zod
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError });
      return;
    }

    // Start loading after successful validation
    set({ isLoading: true });

    // 3. API call with validated data
    try {
      // Use axios.post
      const response = await apiClient.post(
        '/auth/login',
        { loginIdentifier: validationResult.data.email, password: validationResult.data.password }
      );

      const data = response.data;

      // 4. Handle success (axios throws for non-2xx responses)
      console.log('Login successful:', data);
      
      if (rememberMe) {
        // Persist both email and password for future auto-fill
        await AsyncStorage.setItem('rememberedEmail', email);
        await AsyncStorage.setItem('rememberedPassword', password);
      } else {
        // Remove stored credentials when "remember me" is unchecked
        await AsyncStorage.removeItem('rememberedEmail');
        await AsyncStorage.removeItem('rememberedPassword');
      }

      // Persist tokens and user info in state plus AsyncStorage
      // Keep the accessToken so the session survives reloads
      if (data.accessToken) {
        await AsyncStorage.setItem('accessToken', data.accessToken);
        setApiToken(data.accessToken);
      }
      if (data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }

      // Mirror the token inside axios defaults
      setApiToken(data.accessToken);

      set({ user: data.user, accessToken: data.accessToken, errorMessage: null });

      // --- Smart redirect ---
      const profileIsComplete = 
        data.user.age && 
        data.user.location && 
        data.user.gamingPlatformPreferences && 
        data.user.gamingPlatformPreferences.length > 0;

      // If email is verified but the profile is incomplete, require the completion screen
      const redirectTo = (data.user.isEmailVerified && !profileIsComplete) ? './completeProfile' : './home';

      // Redirect automatically without waiting for user confirmation
      setTimeout(() => {
        router.replace(redirectTo);
      }, 500); // Small delay so the toast is noticeable

      showGlobalToast({
        type: 'success',
        title: 'Signed in successfully!',
        message: 'Welcome back!',
      });
      
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error) && error.response) {
        // Surface server-side errors
        set({ errorMessage: error.response.data.message || 'The email or password is incorrect.' });
      } else {
        // Network or unknown error
        set({ errorMessage: 'Unable to contact the server. Please try again.' });
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

    // 2. Client-side validation with Zod
    const validationResult = RegisterSchema.safeParse({ name, username, email, password });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError });
      return;
    }

    // Start loading once validation succeeds
    set({ isLoading: true });

    // 3. API call
    try {
      const response = await apiClient.post('/auth/register', validationResult.data);

      // 4. Handle success - auto-login immediately after registering
      console.log('Registration successful:', response.data);
      
      const data = response.data;
      
      // Persist session info inside state and AsyncStorage (auto login)
      // Keep the accessToken so the session survives reloads
      if (data.accessToken) {
        await AsyncStorage.setItem('accessToken', data.accessToken);
        setApiToken(data.accessToken);
      }
      if (data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }

      // Mirror the token in axios
      setApiToken(data.accessToken);

      set({ 
        user: data.user, 
        accessToken: data.accessToken, 
        errorMessage: null,
        isLoading: false 
      });

      // Check whether the profile is complete
      const profileIsComplete = 
        data.user.age && 
        data.user.location && 
        data.user.gamingPlatformPreferences && 
        data.user.gamingPlatformPreferences.length > 0;

      // Decide where to redirect automatically
      const redirectTo = !profileIsComplete ? './completeProfile' : './home';

      // Auto redirect without user interaction
      setTimeout(() => {
        router.replace(redirectTo);
      }, 500); // Small delay so the toast is visible

      showGlobalToast({
        type: 'success',
        title: 'Registration successful! 🎉',
        message: 'We sent you a welcome email and signed you in automatically.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (axios.isAxiosError(error) && error.response) {
        set({ errorMessage: error.response.data.message || 'Registration failed. Please try again.' });
      } else {
        set({ errorMessage: 'Unable to contact the server. Please try again.' });
      }
    } finally {
      // 5. Stop loading
      set({ isLoading: false });
    }
  },

  logout: async (): Promise<void> => {
    try {
      // Try calling the logout API (optional, non-blocking if it fails)
      try {
        const token = get().accessToken;
        if (token) {
          // Set token temporarily for logout request
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await apiClient.post('/auth/logout');
        }
      } catch (apiError) {
        console.log('Logout API call failed (non-critical):', apiError);
        // Do not throw; continue clearing local storage
      }

      // Clear AsyncStorage
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('rememberedEmail');
      await AsyncStorage.removeItem('rememberedPassword'); // Remove stored password on logout
      
      // Clear apiClient headers
      setApiToken(null);
      
      // Reset store state
      set({ 
        user: null, 
        accessToken: null,
        name: '',
        username: '',
        email: '',
        password: '',
        errorMessage: null,
        successMessage: null,
      });
      
      // Always navigate back to login
      setTimeout(() => {
        router.replace('./login');
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear state and navigate
      AsyncStorage.multiRemove(['accessToken', 'user', 'rememberedEmail', 'rememberedPassword']).catch(() => {});
      set({ user: null, accessToken: null });
      setApiToken(null);
      setTimeout(() => {
        router.replace('./login');
      }, 100);
    }
  },

  sendPasswordResetEmail: async (): Promise<boolean> => {
    const { email } = get();

    // 1. Reset messages
    set({ errorMessage: null, successMessage: null });

    // 2. Client-side validation with Zod
    const validationResult = ForgotPasswordSchema.safeParse({ email });
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError });
      return false;
    }

    // 3. Begin loading
    set({ isLoading: true });

    // 4. API Call
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: validationResult.data.email });

      // 5. Handle success
      set({ successMessage: response.data.message || 'We emailed you reset instructions. Please check your inbox.' });
      showGlobalToast({
        type: 'info',
        title: 'Check your email',
        message: 'We sent password reset instructions to your inbox.',
      });

      return true;

    } catch (error) {
      console.error('Forgot password error:', error);
      if (axios.isAxiosError(error) && error.response) {
        set({ errorMessage: error.response.data.message || 'Email not found or another error occurred.' });
      } else {
        set({ errorMessage: 'Unable to contact the server. Please try again.' });
      }
      return false;
    } finally {
    // 6. Stop loading
      set({ isLoading: false });
    }
  },

  // Action to reset password with OTP
  resetPasswordWithOTP: async (email, otp, newPassword) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });

      set({
        isLoading: false,
        successMessage: response.data.message || 'Mật khẩu đã được đặt lại thành công!',
        errorMessage: null,
      });

      // Tự động điều hướng người dùng đến trang đăng nhập sau một khoảng thời gian
      setTimeout(() => {
        // Giả sử bạn đang dùng expo-router
        // import { router } from 'expo-router';
        // router.replace('./login');
      }, 3000);

    } catch (error: any) {
      const message = error.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      set({
        isLoading: false,
        errorMessage: message,
        successMessage: null,
      });
    }
  },
}));
export default useAuthStore;
