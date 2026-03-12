import { Worker, Job } from 'bullmq';
import puppeteer, { Browser } from 'puppeteer';
import { EvaluationJobPayload, EvaluationJobResult, EVALUATION_QUEUE_NAME } from '@repo/evaluation-types/queue';

// Redis connection setup
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

async function processEvaluationJob(job: Job<EvaluationJobPayload>): Promise<EvaluationJobResult> {
  const { tenantId, submissionId, evaluationRunId, assignmentConfig } = job.data;
  console.log(`[Worker] Processing Job ${job.id} for EvaluationRun ${evaluationRunId}`);
  
  let browser: Browser | null = null;
  const artifactUrls: string[] = [];
  let score = 0;
  let feedback = 'Execution completed successfully.';
  let success = true;

  try {
    // 1. Launch Puppeteer browser instance
    // Note: in Kubernetes, running Chrome requires special arguments like --no-sandbox
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    
    // 2. Navigate to student's submission URL
    await page.goto(assignmentConfig.targetUrl, { waitUntil: 'networkidle0' });

    // 3. Take a screenshot artifact dynamically
    // In a real application, this buffer would be uploaded to the tenant's specific S3 bucket
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    // const s3Url = await s3Upload(`tenant-${tenantId}`, `artifacts/${evaluationRunId}/screenshot.png`, screenshotBuffer);
    
    // Mock S3 URL for now
    const s3Url = `https://s3.amazonaws.com/eval-platform-artifacts-${tenantId}/eval-${evaluationRunId}/screenshot.png`;
    artifactUrls.push(s3Url);

    // 4. Run automated tests/scripts (simplified for illustration)
    const pageTitle = await page.title();
    if (!pageTitle) {
      score = 50;
      feedback = 'Page loaded but missing title tag.';
      success = false;
    } else {
      score = 100;
    }

  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error);
    success = false;
    score = 0;
    feedback = `Evaluation crashed: ${(error as Error).message}`;
  } finally {
    if (browser) await browser.close();
  }

  // 5. Update the Database (Using REST API or direct DB connection)
  // await db.query('UPDATE evaluation_runs SET run_status = $1, score = $2, feedback = $3, completed_at = NOW() WHERE id = $4', ['completed', score, feedback, evaluationRunId]);

  console.log(`[Worker] Completed Job ${job.id} with score ${score}`);

  return {
    success,
    score,
    feedback,
    artifactUrls,
  };
}

// Initialize the Pullmq Worker
const worker = new Worker<EvaluationJobPayload, EvaluationJobResult>(
  EVALUATION_QUEUE_NAME,
  processEvaluationJob,
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});

console.log(`[Worker] Started. Listening on queue: ${EVALUATION_QUEUE_NAME}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully.');
  await worker.close();
  process.exit(0);
});
