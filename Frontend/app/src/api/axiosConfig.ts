import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_JSON_BASE_URL } from '../utils/apiConfig';
import { useAuthStore } from '../stores/authStore';

const apiClient = axios.create({
  baseURL: API_JSON_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const headers = config.headers ?? {};

  if (!headers.Authorization) {
    let token = useAuthStore.getState().accessToken;

    if (!token) {
      try {
        token = await AsyncStorage.getItem('accessToken');
        if (token) {
          useAuthStore.setState({ accessToken: token });
        }
      } catch (error) {
        console.warn('[apiClient] Failed to read accessToken from storage', error);
      }
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  config.headers = headers;
  return config;
});

export default apiClient;
