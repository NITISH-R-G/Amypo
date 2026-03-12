const { Submission, Question, EvaluationRun, Artifact, User } = require('../models');
const staticValidationService = require('../services/staticValidationService');
const { enqueueEvaluation, queueEvents } = require('../services/queueService');
const { updateStreak } = require('../utils/streakManager');

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

    // Update streak (non-blocking)
    updateStreak(student_id).catch(err => console.error('Streak update failed:', err));

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

const listSubmissions = async (req, res) => {
  try {
    const { student_id, question_id, status, limit, offset } = req.query;

    const where = {};
    if (student_id) where.student_id = String(student_id);
    if (question_id) where.question_id = Number(question_id);
    if (status) where.status = String(status);

    const rows = await Submission.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(limit) || 50, 200),
      offset: Number(offset) || 0,
      include: [
        { model: EvaluationRun },
        { model: Question, attributes: ['id', 'title'] }
      ]
    });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSubmissionProgress = async (req, res) => {
  const { id } = req.params;
  const submissionId = id; // Renamed for clarity with the new interval logic
  const acceptedJobIds = new Set([String(id), `submission-${id}`]);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Start a polling interval to send status and occasional logs
  const progressInterval = setInterval(async () => {
    const currentSubmission = await Submission.findByPk(submissionId);
    if (!currentSubmission) {
      // Submission might have been deleted or not found, end stream
      res.write(`data: ${JSON.stringify({ status: 'failed', error: 'Submission not found' })}\n\n`);
      clearInterval(progressInterval);
      res.end();
      return;
    }

    if (currentSubmission.status === 'completed' || currentSubmission.status === 'failed') {
      res.write(`data: ${JSON.stringify({ status: currentSubmission.status })}\n\n`);
      clearInterval(progressInterval);
      res.end();
    } else {
      // Send a random log from current evaluation steps for HUD feel
      const logs = [
        'Analyzing DOM nodes...',
        'Computing layout tree...',
        'Comparing visual fragments...',
        'Checking reactivity...',
        'Scanning for accessibility violations...'
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      res.write(`data: ${JSON.stringify({ status: currentSubmission.status, log: randomLog })}\n\n`);
    }
  }, 1000); // Send updates every second

  const onProgress = ({ jobId, data }) => {
    if (acceptedJobIds.has(String(jobId))) {
      res.write(`data: ${JSON.stringify({ progress: data })}\n\n`);
    }
  };

  const onCompleted = ({ jobId, returnvalue }) => {
    if (acceptedJobIds.has(String(jobId))) {
      res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
      cleanup();
    }
  };

  const onFailed = ({ jobId, failedReason }) => {
    if (acceptedJobIds.has(String(jobId))) {
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

const getSubmissionResult = async (req, res) => {
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

    // If worker hasn't written a run yet, report status and let the UI keep polling.
    if (!submission.EvaluationRun) {
      return res.json({
        status: submission.status,
        submission_id: submission.id
      });
    }

    const run = submission.EvaluationRun;

    // Prefer run.visual_artifacts (worker output). Fall back to Artifacts table if present.
    let visualTests = [];
    if (Array.isArray(run.visual_artifacts) && run.visual_artifacts.length > 0) {
      visualTests = run.visual_artifacts.map(v => ({
        viewport: v.viewport,
        status: v.status || (v.diffPercent != null ? 'passed' : 'failed'),
        diffPercent: Number(v.diffPercent ?? 0),
        visualScore: Number(v.visualScore ?? 0),
        expected: v.expected || null,
        actual: v.actual || null,
        diff: v.diff || null,
        boxes: v.hotspots || []
      }));
    } else if (Array.isArray(run.Artifacts) && run.Artifacts.length > 0) {
      // Artifacts table format: expected/actual/diff types per viewport.
      const viewports = [...new Set(run.Artifacts.map(a => a.viewport))];
      visualTests = viewports.map(vp => {
        const acts = run.Artifacts.filter(a => a.viewport === vp);
        return {
          viewport: vp,
          status: 'passed',
          diffPercent: Number(acts.find(a => a.type === 'diff')?.mismatch_percentage ?? 0),
          visualScore: 0,
          expected: acts.find(a => a.type === 'expected')?.url || null,
          actual: acts.find(a => a.type === 'actual')?.url || null,
          diff: acts.find(a => a.type === 'diff')?.url || null,
          boxes: acts.find(a => a.type === 'diff')?.diff_boxes || []
        };
      });
    }

    const desktop = visualTests.find(v => v.viewport === 'desktop') || visualTests[0] || null;
    const mismatchPercent = Number(desktop?.diffPercent ?? 0);

    return res.json({
      status: submission.status,
      submission_id: submission.id,
      run_id: run.id,
      total_score: submission.total_score ?? null,
      scores: {
        html: run.html_score ?? 0,
        css: run.css_score ?? 0,
        js: run.js_score ?? 0,
        visual: run.visual_score ?? 0,
        a11y: run.a11y_score ?? 0
      },
      breakdown: {
        dom: run.html_score ?? 0,
        css: run.css_score ?? 0,
        visual: run.visual_score ?? 0,
        a11y: run.a11y_score ?? 0
      },
      a11yViolations: run.a11y_violations || [],
      mismatchPercent,
      failedTests: run.failed_tests || [],
      aiFeedback: run.ai_feedback || { summary: 'No AI feedback generated.', suggestions: [] },
      visualArtifacts: desktop
        ? {
            expected: desktop.expected || null,
            actual: desktop.actual || null,
            diff: desktop.diff || null,
            boxes: desktop.boxes || []
          }
        : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  submitCode,
  listSubmissions,
  getSubmissionStatus,
  getSubmissionProgress,
  getSubmissionResult
};
