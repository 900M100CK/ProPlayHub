import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 3000;

const normalizeUrl = (url?: string) => {
  if (!url) return undefined;
  return url.replace(/\/+$/, '');
};

const resolveEnvUrl = (): string | undefined => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const manifest = Constants.expoConfig ?? (Constants as any).manifest;
  const extra = manifest?.extra;
  return (
    extra?.apiUrl ??
    extra?.API_URL ??
    extra?.ApiUrl ??
    extra?.apiURL
  );
};

const resolveExpoHostUrl = (): string | undefined => {
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ||
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest?.hostUri;

  if (!debuggerHost) {
    return undefined;
  }

  const host = debuggerHost.split(':')[0];
  if (!host) {
    return undefined;
  }

  return `http://${host}:${DEFAULT_PORT}`;
};

const fallbackUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://172.16.83.82:3000';

export const API_BASE_URL =
  normalizeUrl(resolveEnvUrl()) ??
  normalizeUrl(resolveExpoHostUrl()) ??
  fallbackUrl;

export const API_JSON_BASE_URL = `${API_BASE_URL}/api`;

export const SOCKET_BASE_URL = API_BASE_URL;

if (__DEV__) {
  console.log('[config] API_BASE_URL ->', API_BASE_URL);
}

// Dummy default export to satisfy Expo Router route scanning when this file lives under app/
const ApiConfigRoute = () => null;
export default ApiConfigRoute;

