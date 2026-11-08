import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../constants/translations';
import { getTheme, lightColors, darkColors } from '../theme/colors';
import {
  api,
  initApiClient,
  setAuthToken,
  persistStoredUser,
  getStoredUser,
  getAuthToken,
  clearAuthSession,
  registerAuthExpiredHandler
} from '../api/client';

const AppContext = createContext(null);

const STORAGE_KEY_LANGUAGE = '@smart_cane_language';
const STORAGE_KEY_THEME = '@smart_cane_theme';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [latestAdvisory, setLatestAdvisory] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [lastReading, setLastReading] = useState(null);

  // Language & Theme state (defaults: English & Signature Dark Emerald Glass)
  const [language, setLanguageState] = useState('en');
  const [themeMode, setThemeModeState] = useState('dark'); // 'dark' | 'light'

  // Directly derived authentication state: true only when a valid user object exists
  const isAuthenticated = Boolean(user && user.email);

  // Check health and initialize session
  const checkHealth = async () => {
    try {
      const res = await api.checkHealth();
      if (res && res.status === 'healthy') {
        setBackendStatus('online');
        return true;
      }
      setBackendStatus('offline');
      return false;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  };

  const loadFields = async () => {
    try {
      setLoading(true);
      const res = await api.getFields();
      if (res && Array.isArray(res.fields)) {
        setFields(res.fields);
        if (res.fields.length > 0) {
          if (!selectedField || !res.fields.some(f => f._id === selectedField._id)) {
            setSelectedField(res.fields[0]);
          }
        } else {
          setSelectedField(null);
        }
      }
    } catch (err) {
      console.warn('[AppContext] Fields fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getHistory();
      if (res && Array.isArray(res.history)) {
        setHistory(res.history);
        const latest = res.history[0];
        if (!latest) {
          setLatestAdvisory(null);
          return;
        }

        if (latest.id) {
          try {
            const detail = await api.getSession(latest.id);
            const session = detail?.session;
            if (session) {
              setLatestAdvisory({
                predictions: {
                  fertilizer: session.fertilizerPrediction,
                  irrigation: session.irrigationPrediction
                },
                advisory: {
                  fertilizer: session.fertilizerAdvisory,
                  water: session.waterAdvisory,
                  soilStatus: session.soilStatusAdvisory
                },
                field: session.metadata || { fieldName: session.fieldName },
                sessionId: session._id,
                timestamp: session.createdAt
              });
            }
          } catch (err) {
            console.warn('[AppContext] Latest analysis fetch warning:', err.message);
          }
        }
      }
    } catch (err) {
      console.warn('[AppContext] History fetch warning:', err.message);
    }
  };

  // Restore stored session on startup
  useEffect(() => {
    async function restoreSession() {
      try {
        await initApiClient();

        // Restore language and theme preferences
        try {
          const savedLang = await AsyncStorage.getItem(STORAGE_KEY_LANGUAGE);
          const savedTheme = await AsyncStorage.getItem(STORAGE_KEY_THEME);
          // Language will be re-evaluated after user object is restored (see below)
          if (savedLang) setLanguageState(savedLang);
          if (savedTheme) setThemeModeState(savedTheme);
        } catch (prefErr) {
          console.warn('[AppContext] Preference load warning:', prefErr);
        }

        const storedUser = await getStoredUser();
        const token = getAuthToken();

        // Strict verification: only grant access if BOTH valid user object and token exist
        if (storedUser && storedUser.email && token) {
          setUser(storedUser);
          // If no language was saved in AsyncStorage, fall back to the user's DB preference
          try {
            const savedLang = await AsyncStorage.getItem(STORAGE_KEY_LANGUAGE);
            if (!savedLang && storedUser.preferredLanguage) {
              setLanguageState(storedUser.preferredLanguage);
            }
          } catch (e) {
            // Ignore — preference already set above if it existed
          }
        } else {
          // If credentials are incomplete or missing, wipe any stale cache and force Login
          await clearAuthSession();
          setUser(null);
        }
        // Non-blocking health probe so splash screen transitions immediately without waiting on cold starts
        checkHealth().catch(() => {});
      } catch (e) {
        console.warn('[AppContext] Session restore error:', e);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    }

    registerAuthExpiredHandler(() => {
      logout();
    });

    restoreSession();
  }, []);

  // When authenticated, load real fields & history
  useEffect(() => {
    if (isAuthenticated) {
      loadFields();
      loadHistory();
    }
  }, [isAuthenticated]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (!res?.user || !res?.token) {
        throw new Error(res?.error || 'Invalid credentials');
      }
      await setAuthToken(res.token);
      await persistStoredUser(res.user);
      setUser(res.user);
      setBackendStatus('online');
      await loadFields();
      return { success: true, user: res.user };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Login failed. Please check your credentials.'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await api.register(userData);
      if (!res?.user || !res?.token) {
        throw new Error(res?.error || 'Registration failed');
      }
      await setAuthToken(res.token);
      await persistStoredUser(res.user);
      setUser(res.user);
      setBackendStatus('online');
      await loadFields();
      return { success: true, user: res.user };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Registration failed. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (fieldId) => {
    try {
      await api.deleteField(fieldId);
      setFields((prev) => {
        const remaining = prev.filter((f) => f._id !== fieldId);
        if (selectedField?._id === fieldId) {
          setSelectedField(remaining[0] || null);
        }
        return remaining;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Could not delete field' };
    }
  };

  const deleteHistoryItem = async (sessionId) => {
    try {
      await api.deleteHistoryItem(sessionId);
      setHistory((prev) => prev.filter((h) => (h.id || h._id) !== sessionId));
      if (latestAdvisory?.sessionId === sessionId) {
        setLatestAdvisory(null);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Could not delete history record' };
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearHistory();
      setHistory([]);
      setLatestAdvisory(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Could not clear history' };
    }
  };

  const logout = async () => {
    // 1. Immediately reset user state so AppRoot switches to LoginScreen synchronously
    setUser(null);
    setFields([]);
    setSelectedField(null);
    setLatestAdvisory(null);
    setLastReading(null);
    setHistory([]);

    // 2. Clear stored credentials and token from AsyncStorage
    try {
      await clearAuthSession();
    } catch (err) {
      console.warn('[AppContext] Logout storage clear error:', err);
    }
  };

  const setLanguage = async (newLang) => {
    try {
      setLanguageState(newLang);
      await AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, newLang);
      // Persist to MongoDB so the preference survives a fresh install / device change
      try {
        await api.updateProfile({ preferredLanguage: newLang });
      } catch (apiErr) {
        // Non-fatal: local AsyncStorage is the source of truth for offline use
        console.warn('[AppContext] Language sync to DB failed:', apiErr.message);
      }
    } catch (e) {
      console.warn('[AppContext] Save language error:', e);
    }
  };

  const setThemeMode = async (newMode) => {
    try {
      setThemeModeState(newMode);
      await AsyncStorage.setItem(STORAGE_KEY_THEME, newMode);
    } catch (e) {
      console.warn('[AppContext] Save theme error:', e);
    }
  };

  const isDark = themeMode === 'dark';
  const themeColors = getTheme(themeMode);

  const t = (key, fallback) => {
    const val = TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key];
    if (val !== undefined && val !== null) return val;
    return fallback !== undefined ? fallback : key;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        isInitializing,
        fields,
        selectedField,
        setSelectedField,
        latestAdvisory,
        setLatestAdvisory,
        lastReading,
        setLastReading,
        history,
        loadHistory,
        loadFields,
        loading,
        backendStatus,
        checkHealth,
        login,
        register,
        logout,
        deleteField,
        deleteHistoryItem,
        clearHistory,
        language,
        setLanguage,
        themeMode,
        setThemeMode,
        isDark,
        themeColors,
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return ctx;
}
