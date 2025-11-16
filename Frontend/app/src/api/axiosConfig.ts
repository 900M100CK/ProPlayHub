import axios from 'axios';
import { Platform } from 'react-native';

// Auto-detect API URL based on platform
// Android emulator: 10.0.2.2
// iOS simulator: localhost
// Physical device: use your computer's local IP (e.g., 192.168.1.100)
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000/api'
  : 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để tự động thêm accessToken vào headers nếu có
apiClient.interceptors.request.use(
  async (config) => {
    // Lấy accessToken từ Zustand store hoặc AsyncStorage
    // Vì đây là module riêng, sẽ lấy từ store khi gọi
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
