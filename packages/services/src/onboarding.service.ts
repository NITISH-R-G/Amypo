import { S3Client, CreateBucketCommand, PutPublicAccessBlockCommand } from '@aws-sdk/client-s3';
// Assuming a hypothetical DB client is passed or imported
// import { db } from './db';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

export interface OnboardingRequest {
  institutionName: string;
  adminEmail: string;
}

export interface OnboardingResult {
  tenantId: string;
  adminId: string;
  bucketName: string;
}

export class OnboardingService {
  /**
   * Orchestrates the onboarding of a new tenant (e.g., a university).
   * 1. Creates a tenant record in the database.
   * 2. Creates the initial admin user.
   * 3. Provisions an isolated S3 bucket for the tenant's artifacts.
   */
  async onboardInstitution(request: OnboardingRequest): Promise<OnboardingResult> {
    console.log(`Starting onboarding for: ${request.institutionName}`);
    
    // 1. Create Tenant in DB
    // const tenant = await db.query('INSERT INTO tenants (name) VALUES ($1) RETURNING id', [request.institutionName]);
    // const tenantId = tenant.rows[0].id;
    const tenantId = crypto.randomUUID(); // Mocking DB insert for now

    // 2. Create Initial Admin User
    // const user = await db.query('INSERT INTO users (tenant_id, email, role) VALUES ($1, $2, $3) RETURNING id', [tenantId, request.adminEmail, 'admin']);
    // const adminId = user.rows[0].id;
    const adminId = crypto.randomUUID(); // Mocking DB insert for now

    // 3. Provision Isolated S3 Bucket
    // Bucket names must be globally unique, so we prefix with a domain/app identifier and the tenant ID
    const bucketName = `eval-platform-artifacts-${tenantId}`;
    
    await this.provisionStorageBucket(bucketName);

    console.log(`Successfully onboarded tenant ${tenantId} with bucket ${bucketName}`);

    return {
      tenantId,
      adminId,
      bucketName,
    };
  }

  /**
   * Creates a private AWS S3 bucket for the tenant.
   */
  private async provisionStorageBucket(bucketName: string): Promise<void> {
    try {
      // Create the bucket
      const createBucketCommand = new CreateBucketCommand({
        Bucket: bucketName,
        // Depending on region, CreateBucketConfiguration might automatically be required.
        // CreateBucketConfiguration: { LocationConstraint: 'us-west-2' } 
      });
      await s3Client.send(createBucketCommand);

      // Block all public access (Security best practice for internal artifacts)
      const blockPublicAccessCommand = new PutPublicAccessBlockCommand({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      });
      await s3Client.send(blockPublicAccessCommand);

      console.log(`Successfully provisioned private bucket: ${bucketName}`);
    } catch (error) {
      console.error(`Failed to provision bucket ${bucketName}:`, error);
      throw new Error(`Bucket provisioning failed: ${(error as Error).message}`);
    }
  }
}
