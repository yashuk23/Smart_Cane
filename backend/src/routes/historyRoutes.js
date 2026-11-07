const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', historyController.getHistory);
router.delete('/', historyController.clearAllHistory);
router.get('/:id', historyController.getSessionById);
router.delete('/:id', historyController.deleteSession);
router.get('/:id/export', historyController.exportSession);

module.exports = router;

