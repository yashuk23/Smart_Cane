/**
 * Weather Service
 * Fetches real-time atmospheric and precipitation data from OpenWeatherMap & Open-Meteo APIs.
 */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Fetch current weather & rainfall for a given latitude/longitude.
 * Returns { temperature_c, humidity, wind_speed_kmh, rainfall_mm, description, city, country, timestamp, source }
 */
async function getCurrentWeather(latitude, longitude) {
  // 1. Try OpenWeatherMap if key is provided
  if (OPENWEATHER_API_KEY) {
    try {
      const url = `${OPENWEATHER_BASE}?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rain1h = data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0;
        return {
          temperature_c: parseFloat((data.main?.temp ?? 28).toFixed(1)),
          humidity: parseFloat((data.main?.humidity ?? 60).toFixed(1)),
          wind_speed_kmh: parseFloat(((data.wind?.speed ?? 0) * 3.6).toFixed(1)), // m/s -> km/h
          rainfall_mm: parseFloat(Number(rain1h).toFixed(1)),
          description: data.weather?.[0]?.description || 'clear sky',
          city: data.name || '',
          country: data.sys?.country || '',
          timestamp: new Date().toISOString(),
          source: 'openweathermap'
        };
      }
    } catch (owmErr) {
      console.warn('[WeatherService] OpenWeatherMap call failed, falling back to Open-Meteo:', owmErr.message);
    }
  }

  // 2. Fallback to Open-Meteo (No API key needed, high reliability for rainfall & weather)
  try {
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(omUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const rain = current.precipitation ?? current.rain ?? 0;
      return {
        temperature_c: parseFloat((current.temperature_2m ?? 28).toFixed(1)),
        humidity: parseFloat((current.relative_humidity_2m ?? 60).toFixed(1)),
        wind_speed_kmh: parseFloat((current.wind_speed_10m ?? 8).toFixed(1)),
        rainfall_mm: parseFloat(Number(rain).toFixed(1)),
        description: rain > 0 ? 'Rainy' : 'Clear',
        city: '',
        country: '',
        timestamp: new Date().toISOString(),
        source: 'open-meteo'
      };
    }
  } catch (omErr) {
    console.warn('[WeatherService] Open-Meteo fallback failed:', omErr.message);
  }

  // 3. Resilient default if network is completely offline
  return {
    temperature_c: 29.5,
    humidity: 62.0,
    wind_speed_kmh: 8.5,
    rainfall_mm: 0.0,
    description: 'Weather offline (seasonal defaults)',
    city: '',
    country: '',
    timestamp: new Date().toISOString(),
    source: 'fallback_defaults'
  };
}

module.exports = { getCurrentWeather };

