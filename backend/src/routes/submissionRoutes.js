const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');

router.post('/', submissionController.submitCode);
router.get('/', submissionController.listSubmissions);
router.get('/:id', submissionController.getSubmissionStatus);
router.get('/:id/progress', submissionController.getSubmissionProgress);
router.get('/:id/result', submissionController.getSubmissionResult);

module.exports = router;
