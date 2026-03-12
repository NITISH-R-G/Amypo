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
    // BullMQ rejects purely-numeric custom job ids; prefix with a stable string.
    // Note: BullMQ also disallows ":" in custom ids.
    jobId: `submission-${submissionId}`,
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
