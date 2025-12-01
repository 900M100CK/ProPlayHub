import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_JSON_BASE_URL } from "../utils/apiConfig"; // Ensure this exports the correct base URL

const apiClient = axios.create({
  baseURL: API_JSON_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let cachedToken: string | null = null;
/**
 * Update the cached token. The interceptor will use this token.
 * @param token - Access token or null to clear.
 */
export const setApiToken = (token: string | null) => {
  cachedToken = token;
};

/**
 * Request interceptor: automatically attaches auth token to each API request.
 * Priority: cached token, then AsyncStorage if cache is empty.
 */
apiClient.interceptors.request.use(async (config) => {
  // Do not override if Authorization header was set manually for this request
  if (config.headers.Authorization) {
    return config;
  }

  // 1) Prefer token from cache
  let token = cachedToken;

  // 2) If missing, read from AsyncStorage
  if (!token) {
    try {
      token = await AsyncStorage.getItem("accessToken");
      if (token) cachedToken = token; // Update cache for next calls
    } catch (error) {
      console.warn("[apiClient] Failed to read accessToken from storage", error);
    }
  }

  // 3) Attach token to header if available
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;
