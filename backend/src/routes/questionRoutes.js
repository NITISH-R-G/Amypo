const express = require('express');
const router = express.Router();

const questionController = require('../controllers/questionController');

router.get('/', questionController.listQuestions);
router.get('/:id', questionController.getQuestionDetails);

module.exports = router;

