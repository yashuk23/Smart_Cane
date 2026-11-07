/**
 * Weather Controller
 * GET /api/weather/current?latitude=...&longitude=...
 */

const { getCurrentWeather } = require('../services/weatherService');

exports.getCurrentWeather = async (req, res) => {
  const latitude = parseFloat(req.query.latitude);
  const longitude = parseFloat(req.query.longitude);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      error: 'Invalid coordinates',
      message: 'Please provide valid numeric latitude and longitude query parameters.'
    });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      error: 'Out-of-range coordinates',
      message: 'latitude must be between -90 and 90; longitude between -180 and 180.'
    });
  }

  try {
    const weather = await getCurrentWeather(latitude, longitude);
    res.json({ success: true, weather });
  } catch (err) {
    console.error('[WeatherController]', err.message);
    res.status(503).json({
      success: false,
      error: 'Weather data unavailable',
      message: err.message
    });
  }
};

