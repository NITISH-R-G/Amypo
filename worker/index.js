const { Worker } = require('bullmq');
const dotenv = require('dotenv');
const evaluator = require('./src/evaluator');
// We need access to the DB models
// Usually we'd extract models into a shared package, but for monorepo this works too:
const { Submission, EvaluationRun } = require('../backend/src/models');

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
    // (mock implementation, you must load these via Sequelize)
    // const testSpec = await TestSpec.findOne({ where: { question_id: submission.question_id }});
    // const baselines = await Baseline.findAll({ where: { question_id: submission.question_id }});
    
    // For now, let's just create a dummy result for the pipeline scaffold:
    const htmlCode = submission.html_content || '';
    const cssCode = submission.css_content || '';
    const jsCode = submission.js_content || '';

    // 3. Execute puppeteer sandbox
    const result = await evaluator.evaluateSubmission(submissionId, htmlCode, cssCode, jsCode, null, null, [], job);

    // 4. Generate AI Feedback
    const { generateFeedback } = require('./src/aiFeedback');
    const feedback = await generateFeedback(
      result.failedTests || [], 
      result.consoleErrors || [], 
      result.layoutHints || [], 
      result.visualArtifacts || []
    );

    // 5. Save results to DB
    await EvaluationRun.create({
      submission_id: submissionId,
      html_score: result.scores.html,
      css_score: result.scores.css,
      js_score: result.scores.js,
      visual_score: result.scores.visual,
      console_errors: result.consoleErrors,
      execution_timings: result.timings,
      ai_feedback: feedback,
      failed_tests: result.failedTests,
      visual_artifacts: result.visualArtifacts
    });

    const totalScore = result.scores.html + result.scores.css + result.scores.js + result.scores.visual;

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
  concurrency: process.env.WORKER_CONCURRENCY || 2 // limits headless chromium instances
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} encountered an error: ${err.message}`);
});
