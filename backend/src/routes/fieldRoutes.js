const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/fieldController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', fieldController.getFields);
router.get('/:id', fieldController.getFieldById);
router.post('/', fieldController.createField);
router.put('/:id', fieldController.updateField);
router.delete('/:id', fieldController.deleteField);

module.exports = router;

