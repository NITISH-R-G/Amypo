const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Define AI endpoints
router.post('/fix', aiController.fixCode);

module.exports = router;
