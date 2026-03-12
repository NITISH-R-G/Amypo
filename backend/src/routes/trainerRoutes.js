const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

router.get('/analytics/questions/:questionId', trainerController.getQuestionAnalytics);

module.exports = router;
