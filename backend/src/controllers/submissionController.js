const { Submission, Question, EvaluationRun, Artifact } = require('../models');
const staticValidationService = require('../services/staticValidationService');
const { enqueueEvaluation, queueEvents } = require('../services/queueService');

const submitCode = async (req, res) => {
  try {
    const { question_id, student_id, html_content, css_content, js_content } = req.body;

    if (!question_id || !student_id) {
      return res.status(400).json({ error: 'question_id and student_id are required' });
    }

    // 1. Fetch Question and Inject Allowed Libraries
    const question = await Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let finalHtml = html_content;
    if (question.allowed_libraries && question.allowed_libraries.length > 0) {
      const injections = question.allowed_libraries.map(lib => {
        if (lib.endsWith('.css')) return `<link rel="stylesheet" href="${lib}">`;
        if (lib.endsWith('.js')) return `<script src="${lib}"></script>`;
        return '';
      }).join('\n');
      finalHtml = `${injections}\n${html_content}`;
    }

    // 2. Run Static Validation
    const validationResults = await staticValidationService.validateSetup(finalHtml, css_content, js_content);

    // 2. Create Submission Record
    const submission = await Submission.create({
      question_id,
      student_id,
      html_content,
      css_content,
      js_content,
      status: validationResults.isValid ? 'pending' : 'failed',
      static_validation_results: validationResults
    });

    // 3. Queue for worker if valid
    if (validationResults.isValid) {
      await enqueueEvaluation(submission.id);
    }

    return res.status(201).json({
      message: validationResults.isValid ? 'Submission queued' : 'Syntax validation failed',
      submission_id: submission.id,
      status: submission.status,
      validation: validationResults
    });

  } catch (error) {
    console.error('Submit Code Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findByPk(id, {
      include: [
        {
          model: EvaluationRun,
          include: [Artifact]
        }
      ]
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    
    return res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSubmissionProgress = async (req, res) => {
  const { id } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const onProgress = ({ jobId, data }) => {
    if (jobId === id) {
      res.write(`data: ${JSON.stringify({ progress: data })}\n\n`);
    }
  };

  const onCompleted = ({ jobId, returnvalue }) => {
    if (jobId === id) {
      res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
      cleanup();
    }
  };

  const onFailed = ({ jobId, failedReason }) => {
    if (jobId === id) {
      res.write(`data: ${JSON.stringify({ status: 'failed', error: failedReason })}\n\n`);
      cleanup();
    }
  };

  queueEvents.on('progress', onProgress);
  queueEvents.on('completed', onCompleted);
  queueEvents.on('failed', onFailed);

  const cleanup = () => {
    queueEvents.off('progress', onProgress);
    queueEvents.off('completed', onCompleted);
    queueEvents.off('failed', onFailed);
    res.end();
  };

  req.on('close', cleanup);
};

module.exports = {
  submitCode,
  getSubmissionStatus,
  getSubmissionProgress
};
