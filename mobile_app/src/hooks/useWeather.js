/**
 * useWeather – fetches live temperature, humidity, and wind speed from OpenWeatherMap.
 *
 * Automatically uses:
 * 1. Field GPS coordinates (if configured), OR
 * 2. Mobile device's live GPS location via expo-location.
 *
 * Features:
 * - weather: { temperature_c, humidity, wind_speed_kmh, description, city, country, timestamp, source }
 * - coords: { latitude, longitude }
 * - locationType: 'device' | 'field' | 'none'
 * - loading: boolean
 * - error: string | null
 * - refresh(): re-fetches for current coords
 * - useDeviceGPS(): forces fetching mobile GPS and loads weather for it
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { getDeviceLocation } from '../services/locationService';

export default function useWeather(fieldLat, fieldLon) {
  const [weather, setWeather] = useState(null);
  const [coords, setCoords] = useState(
    fieldLat != null && fieldLon != null ? { latitude: fieldLat, longitude: fieldLon } : null
  );
  const [locationType, setLocationType] = useState(
    fieldLat != null && fieldLon != null ? 'field' : 'none'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Sync with field coords when prop changes
  useEffect(() => {
    if (fieldLat != null && fieldLon != null) {
      setCoords({ latitude: fieldLat, longitude: fieldLon });
      setLocationType('field');
    }
  }, [fieldLat, fieldLon]);

  const fetchWeatherForCoords = useCallback(async (lat, lon, type = 'field') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWeather(lat, lon);
      if (res?.weather) {
        setWeather(res.weather);
        setCoords({ latitude: lat, longitude: lon });
        setLocationType(type);
        setLastFetched(new Date());
      } else {
        throw new Error('Weather data could not be retrieved.');
      }
    } catch (err) {
      setError(
        err.message?.includes('API key not configured')
          ? 'OpenWeatherMap API key not set in backend/.env'
          : err.message || 'Could not fetch live weather. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Force fetching mobile device GPS
  const useDeviceGPS = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await getDeviceLocation();
      await fetchWeatherForCoords(loc.latitude, loc.longitude, 'device');
    } catch (err) {
      setError(err.message || 'Could not access mobile GPS location.');
      setLoading(false);
    }
  }, [fetchWeatherForCoords]);

  // Initial load: use field coords if available, else auto-detect device location
  useEffect(() => {
    if (fieldLat != null && fieldLon != null) {
      fetchWeatherForCoords(fieldLat, fieldLon, 'field');
    } else {
      // Auto-detect mobile device location
      useDeviceGPS();
    }
  }, [fieldLat, fieldLon, fetchWeatherForCoords, useDeviceGPS]);

  const refresh = useCallback(() => {
    if (coords) {
      fetchWeatherForCoords(coords.latitude, coords.longitude, locationType);
    } else {
      useDeviceGPS();
    }
  }, [coords, locationType, fetchWeatherForCoords, useDeviceGPS]);

  return {
    weather,
    coords,
    locationType,
    loading,
    error,
    lastFetched,
    refresh,
    useDeviceGPS
  };
}
