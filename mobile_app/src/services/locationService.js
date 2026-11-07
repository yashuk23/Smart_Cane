/**
 * Location Service for Smart Cane
 * Uses expo-location to obtain high-precision device GPS coordinates.
 * Includes graceful fallback and permission handling.
 */

import * as Location from 'expo-location';

/**
 * Request device location permission and return current GPS coordinates.
 * Returns { latitude: number, longitude: number, city?: string }
 */
export async function getDeviceLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied. Please enable location access in settings to get live weather for your farm.');
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      mayShowUserSettingsDialog: true
    });

    const latitude = parseFloat(pos.coords.latitude.toFixed(4));
    const longitude = parseFloat(pos.coords.longitude.toFixed(4));

    return {
      latitude,
      longitude,
      accuracy: pos.coords.accuracy
    };
  } catch (err) {
    // If running in environment without expo-location native layer, try web navigator
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: parseFloat(pos.coords.latitude.toFixed(4)),
              longitude: parseFloat(pos.coords.longitude.toFixed(4))
            });
          },
          (navErr) => reject(new Error(navErr.message || 'Could not fetch device location'))
        );
      });
    }
    throw err;
  }
}

