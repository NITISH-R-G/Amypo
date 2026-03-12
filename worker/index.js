const { Worker } = require('bullmq');
const dotenv = require('dotenv');
const evaluator = require('./src/evaluator');
// We need access to the DB models
// Usually we'd extract models into a shared package, but for monorepo this works too:
const { Submission, EvaluationRun, TestSpec, Baseline, WhitelistDomain, Question } = require('../backend/src/models');

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

console.log('Starting Evaluation Worker...');

const worker = new Worker('evaluation-queue', async job => {
  const { submissionId } = job.data;
  console.log(`Processing job ${job.id} for submission ${submissionId}`);

  try {
    // 1. Fetch submission details
    const submission = await Submission.findByPk(submissionId);
    if (!submission) throw new Error('Submission not found');

    // Set status
    await submission.update({ status: 'running' });

    // 2. Fetch Question and TestSpec
    const question = await Question.findByPk(submission.question_id);
    const testSpecRow = await TestSpec.findOne({ where: { question_id: submission.question_id } });
    const testSpec = testSpecRow ? testSpecRow.spec_json : null;

    const baselines = await Baseline.findAll({ where: { question_id: submission.question_id } });

    const allowedDomainsRows = await WhitelistDomain.findAll();
    const allowedDomains = allowedDomainsRows.map(r => r.domain);
    
    // For now, let's just create a dummy result for the pipeline scaffold:
    let htmlCode = submission.html_content || '';
    const cssCode = submission.css_content || '';
    const jsCode = submission.js_content || '';

    // Inject allowed libraries (CDNs) into both student HTML and baseline HTML if present.
    if (question?.allowed_libraries && question.allowed_libraries.length > 0) {
      const injections = question.allowed_libraries.map(lib => {
        if (lib.endsWith('.css')) return `<link rel="stylesheet" href="${lib}">`;
        if (lib.endsWith('.js')) return `<script src="${lib}"></script>`;
        return '';
      }).join('\n');
      htmlCode = `${injections}\n${htmlCode}`;

      if (testSpec?.baseline?.html) {
        testSpec.baseline.html = `${injections}\n${testSpec.baseline.html}`;
      }
    }

    // Create the run first to get a stable runId for artifact storage (/artifacts/{runId}/...)
    const run = await EvaluationRun.create({
      submission_id: submissionId,
      html_score: 0,
      css_score: 0,
      js_score: 0,
      visual_score: 0,
      console_errors: [],
      execution_timings: {},
      ai_feedback: { summary: 'Evaluation in progress...', suggestions: [] },
      failed_tests: [],
      visual_artifacts: []
    });

    // 3. Execute puppeteer sandbox (writes artifacts to /artifacts/{run.id}/)
    const result = await evaluator.evaluateSubmission(run.id, submissionId, htmlCode, cssCode, jsCode, testSpec, baselines, allowedDomains, job);

    // 4. Generate AI Feedback
    const { generateFeedback } = require('./src/aiFeedback');
    const feedback = await generateFeedback(
      result.failedTests || [], 
      result.consoleErrors || [], 
      result.layoutHints || [], 
      result.visualArtifacts || []
    );

    // 5. Update run in DB
    await run.update({
      html_score: result.scores.html,
      css_score: result.scores.css,
      js_score: result.scores.js,
      visual_score: result.scores.visual,
      console_errors: result.consoleErrors,
      execution_timings: result.timings,
      ai_feedback: feedback,
      failed_tests: result.failedTests,
      visual_artifacts: result.visualArtifacts,
      a11y_score: result.scores.a11y || 0,
      a11y_violations: result.a11yViolations || []
    });

    const totalScore = result.total_score || 
      (result.scores.html + result.scores.css + result.scores.js + result.scores.visual + (result.scores.a11y || 0));

    await submission.update({
      status: 'completed',
      total_score: totalScore
    });

    if (job) await job.updateProgress({ stage: 'Evaluation complete' });
    console.log(`Job ${job.id} completed. Score: ${totalScore}`);

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await Submission.update({ status: 'failed' }, { where: { id: submissionId } });
    throw error;
  }
}, { 
  connection,
  concurrency: Number(process.env.WORKER_CONCURRENCY) || 2 // limits headless chromium instances
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} encountered an error: ${err.message}`);
});
