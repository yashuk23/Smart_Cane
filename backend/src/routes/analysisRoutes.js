const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/simulate', analysisController.simulateReadings);
router.post('/analyze', analysisController.performAnalysis);

module.exports = router;

