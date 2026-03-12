export interface EvaluationJobPayload {
  tenantId: string;
  submissionId: string;
  evaluationRunId: string;
  assignmentConfig: {
    targetUrl: string;
    expectedVisuals: string[]; // e.g., bucket URLs for baseline images
    testScripts: string[];     // User-provided JS test scripts or similar
  };
}

export const EVALUATION_QUEUE_NAME = 'evaluation-queue';

export interface EvaluationJobResult {
  success: boolean;
  score: number;
  feedback: string;
  artifactUrls: string[];
}
