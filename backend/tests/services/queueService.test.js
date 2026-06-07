const queueService = require('../../src/services/queueService');

describe('QueueService', () => {
  beforeEach(() => {
    // Reset any mock counts if necessary
    jest.clearAllMocks();
  });

  describe('enqueueEvaluation', () => {
    it('should throw error if submissionId is missing', async () => {
      await expect(queueService.enqueueEvaluation(null)).rejects.toThrow('submissionId is required');
    });

    it('should add evaluation job to queue', async () => {
      queueService.evaluationQueue.add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
      await queueService.enqueueEvaluation(1);
      expect(queueService.evaluationQueue.add).toHaveBeenCalledWith(
        'evaluate',
        { submissionId: 1 },
        {
          jobId: 'submission-1',
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      );
    });

    it('should add evaluation job to queue with runId', async () => {
      queueService.evaluationQueue.add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
      await queueService.enqueueEvaluation(1, 2);
      expect(queueService.evaluationQueue.add).toHaveBeenCalledWith(
        'evaluate',
        { submissionId: 1, runId: 2 },
        {
          jobId: 'replay-1-2',
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      );
    });
  });

  describe('enqueueBaseline', () => {
    it('should throw error if questionId is missing', async () => {
      await expect(queueService.enqueueBaseline(null)).rejects.toThrow('questionId is required');
    });

    it('should add baseline job to queue', async () => {
      queueService.evaluationQueue.add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
      const job = await queueService.enqueueBaseline(1, 2);
      expect(queueService.evaluationQueue.add).toHaveBeenCalledWith(
        'baseline',
        { mode: 'baseline', questionId: 1, version: 2 },
        expect.objectContaining({
          jobId: expect.stringMatching(/^baseline-q1-v2-\d+$/),
          attempts: 1
        })
      );
      expect(job).toEqual({ id: 'mock-job-id' });
    });
  });

  describe('closeQueues', () => {
    it('should call close on evaluationQueue and queueEvents', async () => {
      queueService.evaluationQueue.close = jest.fn().mockResolvedValue();
      queueService.queueEvents.close = jest.fn().mockResolvedValue();

      await queueService.closeQueues();

      expect(queueService.evaluationQueue.close).toHaveBeenCalled();
      expect(queueService.queueEvents.close).toHaveBeenCalled();
    });

    it('should catch errors when closing queues', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      queueService.evaluationQueue.close = jest.fn().mockRejectedValue(new Error('close error'));

      await queueService.closeQueues();
      expect(consoleSpy).toHaveBeenCalledWith('Error closing queues', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
