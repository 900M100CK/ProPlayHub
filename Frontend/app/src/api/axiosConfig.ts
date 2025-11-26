import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_JSON_BASE_URL } from '../utils/apiConfig'; // Giả sử tệp này tồn tại và export đúng URL

const apiClient = axios.create({
  baseURL: API_JSON_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let cachedToken: string | null = null;
/**
 * Cập nhật token trong bộ nhớ cache. Interceptor sẽ sử dụng token này.
 * @param token - Access token hoặc null để xóa.
 */
export const setApiToken = (token: string | null) => {
  cachedToken = token;
};

/**
 * Interceptor này sẽ tự động đính kèm token xác thực vào mỗi yêu cầu API.
 * Nó ưu tiên sử dụng token từ cache, nếu không có sẽ đọc từ AsyncStorage.
 */
apiClient.interceptors.request.use(async (config) => {
  // Không ghi đè nếu header Authorization đã được thiết lập thủ công cho một request cụ thể
  if (config.headers.Authorization) {
    return config;
  }
  
  // 1. Ưu tiên lấy token từ cache
  let token = cachedToken;
  
  // 2. Nếu không có trong cache, thử lấy từ AsyncStorage
  if (!token) {
    try {
      token = await AsyncStorage.getItem('accessToken');
      if (token) cachedToken = token; // Cập nhật cache cho các lần gọi sau
    } catch (error) {
      console.warn('[apiClient] Failed to read accessToken from storage', error);
    }
  }

  // 3. Nếu có token, đính kèm vào header
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;
