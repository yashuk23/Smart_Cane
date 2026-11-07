const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getFertilizerRecommendation, getWaterRecommendation } = require('../controllers/recommendationController');

// POST /api/recommendations/fertilizer  – 9 input parameters
router.post('/fertilizer', authMiddleware, getFertilizerRecommendation);

// POST /api/recommendations/water  – 10 input parameters
router.post('/water', authMiddleware, getWaterRecommendation);

module.exports = router;

