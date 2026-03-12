const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');

router.post('/', submissionController.submitCode);
router.get('/:id', submissionController.getSubmissionStatus);
router.get('/:id/progress', submissionController.getSubmissionProgress);

module.exports = router;
