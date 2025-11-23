import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_JSON_BASE_URL } from '../utils/apiConfig';

const apiClient = axios.create({
  baseURL: API_JSON_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let cachedToken: string | null = null;

export const setApiToken = (token: string | null) => {
  cachedToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

apiClient.interceptors.request.use(async (config) => {
  const headers = config.headers ?? {};

  if (!headers.Authorization) {
    let token = cachedToken;

    if (!token) {
      try {
        token = await AsyncStorage.getItem('accessToken');
        if (token) {
          cachedToken = token;
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
