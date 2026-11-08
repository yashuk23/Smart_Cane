import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const PRODUCTION_API_URL = 'https://smart-cane-backend.onrender.com';

const STORAGE_KEY_BASE_URL = '@smart_cane_api_base_url';
const STORAGE_KEY_AUTH_TOKEN = '@smart_cane_auth_token';
const STORAGE_KEY_USER = '@smart_cane_user';

/**
 * Resolves the initial backend API Base URL:
 * 1. process.env.EXPO_PUBLIC_API_URL
 * 2. Constants.expoConfig?.extra?.apiUrl
 * 3. process.env.EXPO_PUBLIC_NGROK_URL
 * 4. Local dev host / emulator IF in __DEV__ mode
 * 5. Default production Render URL for standalone APK builds
 */
export function resolveDefaultBaseUrl() {
  const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const configuredNgrokUrl = process.env.EXPO_PUBLIC_NGROK_URL?.trim();
  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl?.trim();

  // If valid production URL or explicit public URL is provided
  if (configuredApiUrl && !configuredApiUrl.includes('your-ngrok-url')) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  if (extraApiUrl) {
    return extraApiUrl.replace(/\/$/, '');
  }

  if (configuredNgrokUrl && !configuredNgrokUrl.includes('your-ngrok-url')) {
    return configuredNgrokUrl.replace(/\/$/, '');
  }

  // Development mode local fallback (Expo Go / local emulator)
  if (__DEV__) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const webHost = window.location.hostname || 'localhost';
      return `http://${webHost}:5000`;
    }
    const configuredApiHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
    const expoHostUri = Constants.expoConfig?.hostUri
      || Constants.manifest2?.extra?.expoClient?.hostUri
      || Constants.manifest?.debuggerHost;
    const expoHost = expoHostUri?.split(':')[0];
    const devHost = configuredApiHost || expoHost || '10.0.2.2';
    return `http://${devHost}:5000`;
  }

  // Default for production APK builds
  return PRODUCTION_API_URL;
}

let API_BASE_URL = resolveDefaultBaseUrl();
let authToken = null;
let onAuthExpiredCallback = null;

export function registerAuthExpiredHandler(cb) {
  onAuthExpiredCallback = cb;
}

// Initialize stored configurations on startup
export async function initApiClient() {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_BASE_URL);
    if (savedUrl) {
      const cleanedUrl = savedUrl.trim().replace(/\/$/, '');
      // Purge any stale local development URLs (e.g. 192.168.x.x, localhost, or unencrypted http) if running in production
      const isStaleLocalUrl = cleanedUrl.includes('192.168.') || cleanedUrl.includes('localhost') || cleanedUrl.includes('10.0.2.2') || cleanedUrl.startsWith('http://');
      if (!__DEV__ && isStaleLocalUrl) {
        console.log('[API Client] Purging stale local development URL from cache in production APK:', cleanedUrl);
        await AsyncStorage.removeItem(STORAGE_KEY_BASE_URL);
        API_BASE_URL = resolveDefaultBaseUrl();
      } else {
        API_BASE_URL = cleanedUrl;
      }
    } else {
      API_BASE_URL = resolveDefaultBaseUrl();
    }

    const savedToken = await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
    if (savedToken) {
      authToken = savedToken;
    }
  } catch (e) {
    console.warn('[API Client] Storage init warning:', e.message);
  }
  return { API_BASE_URL, authToken };
}

export async function setApiBaseUrl(url) {
  if (url && url.trim()) {
    API_BASE_URL = url.trim().replace(/\/$/, '');
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BASE_URL, API_BASE_URL);
    } catch (e) {
      console.warn('[API Client] Failed to persist URL:', e.message);
    }
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function clearAuthSession() {
  authToken = null;
  try {
    await AsyncStorage.multiRemove([STORAGE_KEY_AUTH_TOKEN, STORAGE_KEY_USER]);
  } catch (e) {
    console.warn('[API Client] Failed to clear session:', e.message);
  }
}

export async function setAuthToken(token) {
  authToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    }
  } catch (e) {
    console.warn('[API Client] Failed to persist token:', e.message);
  }
}

export function getAuthToken() {
  return authToken;
}

export async function persistStoredUser(user) {
  try {
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (e) {
    console.warn('[API Client] Failed to persist user:', e.message);
  }
}

export async function getStoredUser() {
  try {
    const str = await AsyncStorage.getItem(STORAGE_KEY_USER);
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}, timeoutMs = 30000) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { message: await res.text() };
    }

    if (!res.ok) {
      if (res.status === 401 && endpoint !== '/api/auth/login') {
        if (onAuthExpiredCallback) onAuthExpiredCallback();
      }
      const err = new Error(data.error || data.message || `HTTP Error ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn('[API Client] Timeout reaching', API_BASE_URL);
      const timeoutError = new Error('The server is taking longer than usual to respond (it may be waking up from sleep). Please try again in a moment.');
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    // Network failure (offline, refused connection, cleartext blocked)
    if (err.message && (err.message.includes('Network request failed') || err.message.includes('fetch failed'))) {
      console.warn('[API Client] Network failure reaching', API_BASE_URL, err.message);
      const netErr = new Error('Could not connect to the Smart Cane server. Please check your internet connection and try again.');
      netErr.isNetworkError = true;
      throw netErr;
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password })
  }, 35000),
  register: (userData) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: userData.name?.trim(),
      email: userData.email?.trim().toLowerCase(),
      password: userData.password,
      phone: userData.phone?.trim() || '',
      region: userData.region?.trim() || 'South'
    })
  }, 35000),
  getProfile: () => request('/api/auth/profile'),
  updateProfile: (data) => request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Fields
  getFields: () => request('/api/fields'),
  getField: (id) => request(`/api/fields/${id}`),
  createField: (fieldData) => request('/api/fields', {
    method: 'POST',
    body: JSON.stringify(fieldData)
  }),
  updateField: (id, fieldData) => request(`/api/fields/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fieldData)
  }),
  deleteField: (id) => request(`/api/fields/${id}`, {
    method: 'DELETE'
  }),

  // Soil Simulation & Analysis
  simulateReadings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/analysis/simulate?${qs}`);
  },
  runAnalysis: (payload) => request('/api/analysis/analyze', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, 45000), // Render free tier cold-start + ML processing

  // History & Reports
  getHistory: () => request('/api/history'),
  getSession: (id) => request(`/api/history/${id}`),
  deleteHistoryItem: (id) => request(`/api/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => request('/api/history', { method: 'DELETE' }),
  exportSessionUrl: (id, format = 'csv') => `${API_BASE_URL}/api/history/${id}/export?format=${format}`,

  // Health probe
  checkHealth: () => request('/health', {}, 15000),

  // Recommendation modules (independent – fertilizer uses 9 params, water uses 10)
  getFertilizerRecommendation: (payload) => request('/api/recommendations/fertilizer', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, 45000),
  getWaterRecommendation: (payload) => request('/api/recommendations/water', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, 45000),

  // Live weather
  getWeather: (latitude, longitude) => request(`/api/weather/current?latitude=${latitude}&longitude=${longitude}`, {}, 15000),
};
