const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getCurrentWeather } = require('../controllers/weatherController');

// GET /api/weather/current?latitude=...&longitude=...
router.get('/current', authMiddleware, getCurrentWeather);

module.exports = router;

