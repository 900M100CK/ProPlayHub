﻿import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import apiClient, { setApiToken } from '../api/axiosConfig'; // Use the preconfigured apiClient
import axios from 'axios'; // Keep axios for isAxiosError checks
import { z } from 'zod';
import { showGlobalToast } from '../components/toastService';

// Define constants for AsyncStorage keys to avoid typos
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';
const REMEMBERED_PASSWORD_KEY = 'rememberedPassword';

// 1. Define validation schemas with Zod
const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const RegisterSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }),
  email: z.string().email({message: 'Invalid email address.'}),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

// Forgot-password schema
const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

// Schema for completing profile
const CompleteProfileSchema = z.object({
  displayName: z.string().trim().min(3, { message: 'Display Name must be at least 3 characters.' }),
  // Age is optional, but if provided, it must be a valid number.
  age: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)), // Convert empty string to 0, otherwise to number
    z.number().int().min(0, 'Age cannot be negative.').optional()
  ),
  location: z.string().trim().min(1, { message: 'Location is required.' }),
  address: z.string().optional(),
  gamingPlatformPreferences: z.array(z.string()).min(1, { message: 'Please select at least one platform.' }),
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
  restoreSession: () => Promise<void>; // New action to restore session
  completeProfile: (data: z.infer<typeof CompleteProfileSchema>) => Promise<void>;
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
      const rememberedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      const rememberedPassword = await AsyncStorage.getItem(REMEMBERED_PASSWORD_KEY);
      
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

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const userString = await AsyncStorage.getItem('user');

      if (token && userString) {
        // 1. Tạm thời đặt token và user vào state
        const user = JSON.parse(userString);
        set({ accessToken: token, user });
        setApiToken(token); // Cập nhật token cho apiClient

        // 2. Xác thực token bằng cách gọi một endpoint được bảo vệ
        // Endpoint `/auth/me` hoặc `/auth/profile` là lựa chọn tốt
        try {
          const response = await apiClient.get('/auth/me'); // Giả sử bạn có endpoint này
          // Nếu thành công, cập nhật lại thông tin user mới nhất
          set({ user: response.data.user, isLoading: false });
          // Người dùng đã được xác thực, có thể điều hướng ở layout
        } catch (verifyError) {
          // Token không hợp lệ (hết hạn, bị thu hồi, v.v.)
          console.log('Session restore failed, token invalid. Logging out.');
          await get().logout(); // Xóa dữ liệu cũ và điều hướng về login
        }
      } else {
        // Không có token, không cần làm gì cả
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Failed to restore session.', e);
      set({ isLoading: false });
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
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, validationResult.data.email);
        await AsyncStorage.setItem(REMEMBERED_PASSWORD_KEY, validationResult.data.password);
      } else {
        // Remove stored credentials when "remember me" is unchecked
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
        await AsyncStorage.removeItem(REMEMBERED_PASSWORD_KEY);
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
      // Nếu isNewUser là true, chuyển đến completeProfile. Ngược lại, đến home.
      const redirectTo = data.isNewUser ? './completeProfile' : './home';

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
      if (axios.isAxiosError(error) && error.response) {
        // Surface server-side errors without console noise
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
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      await AsyncStorage.removeItem(REMEMBERED_PASSWORD_KEY); // Remove stored password on logout
      
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
      AsyncStorage.multiRemove(['accessToken', 'user', REMEMBERED_EMAIL_KEY, REMEMBERED_PASSWORD_KEY]).catch(() => {});
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
    const normalizedEmail = (email || "").trim().toLowerCase();
    const validationResult = ForgotPasswordSchema.safeParse({ email: normalizedEmail });
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
    const trimmedEmail = (email || '').trim();
    const trimmedOtp = (otp || '').trim();
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email: trimmedEmail,
        otp: trimmedOtp,
        newPassword,
      });

      set({
        isLoading: false,
        successMessage: response.data.message || 'Password reset successfully.',
        errorMessage: null,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Could not reset password. Please try again.';
      set({
        isLoading: false,
        errorMessage: message,
        successMessage: null,
      });
    }
  },

  completeProfile: async (data) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });

    const validationResult = CompleteProfileSchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0].message;
      set({ errorMessage: firstError, isLoading: false });
      showGlobalToast({ type: 'error', title: 'Validation Error', message: firstError });
      return;
    }

    try { 
      const response = await apiClient.put('/auth/complete-profile', validationResult.data);

      const updatedUser = response.data.user;

      // Update user in state and storage
      set({
        user: updatedUser,
        isLoading: false,
        successMessage: 'Profile completed successfully!',
      });
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      showGlobalToast({
        type: 'success',
        title: 'Profile Complete!',
        message: 'Welcome to ProPlayHub!',
      });

      // Navigate to home screen after completion
      router.replace('./home');

    } catch (error) {
      let message = 'Could not complete your profile. Please try again.';
      if (axios.isAxiosError(error) && error.response) {
        message = error.response.data.message || error.response.data.details || message;
      }
      set({ isLoading: false, errorMessage: message });
      showGlobalToast({ type: 'error', title: 'Update Failed', message });
    }
  },
}));
export default useAuthStore;
