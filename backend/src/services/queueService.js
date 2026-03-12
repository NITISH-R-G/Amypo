const { Queue, QueueEvents } = require('bullmq');
const dotenv = require('dotenv');

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

const evaluationQueue = new Queue('evaluation-queue', { connection });
const queueEvents = new QueueEvents('evaluation-queue', { connection });

const enqueueEvaluation = async (submissionId) => {
  await evaluationQueue.add('evaluate', { submissionId }, {
    jobId: submissionId.toString(),
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
};

module.exports = {
  evaluationQueue,
  queueEvents,
  enqueueEvaluation
};
