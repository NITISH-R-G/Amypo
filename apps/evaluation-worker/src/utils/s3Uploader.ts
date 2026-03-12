import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// The credentials here usually fall back to IAM Roles in production Kubernetes 
// or can be passed explicitly via ENV for local dev.
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  } : {})
});

export class ArtifactUploader {
  private bucketName: string;

  constructor(tenantId: string) {
    // We derive the isolated bucket name logically ensuring tenant data separation
    this.bucketName = `eval-platform-artifacts-${tenantId}`;
  }

  /**
   * Uploads a raw Buffer directly to the S3 bucket without writing to the local disk,
   * completely avoiding container disk exhaustion on heavy workloads.
   */
  public async uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: destinationPath,
        Body: buffer,
        ContentType: contentType,
        // Optional: Assuming the bucket policy blocks public ACLs, this is safe,
        // but explicit internal routing is preferred.
      });

      await s3Client.send(command);

      // Return the hypothetical CloudFront or raw S3 URL for record keeping
      return `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${destinationPath}`;
    } catch (error) {
      console.error(`[ArtifactUploader] Failed to upload ${destinationPath} to ${this.bucketName}:`, error);
      throw error;
    }
  }

  /**
   * Uploads the full triplet of visual regression assets.
   */
  public async uploadRegressionSuite(
    evaluationRunId: string,
    expectedBuffer: Buffer,
    actualBuffer: Buffer,
    diffBuffer: Buffer
  ): Promise<{ expectedUrl: string; actualUrl: string; diffUrl: string }> {
    
    const rootPath = `evaluations/${evaluationRunId}/visual-diffs`;

    // Upload concurrently for performance
    const [expectedUrl, actualUrl, diffUrl] = await Promise.all([
      this.uploadBuffer(expectedBuffer, `${rootPath}/expected.png`),
      this.uploadBuffer(actualBuffer, `${rootPath}/actual.png`),
      this.uploadBuffer(diffBuffer, `${rootPath}/diff.png`),
    ]);

    return {
      expectedUrl,
      actualUrl,
      diffUrl
    };
  }
}
