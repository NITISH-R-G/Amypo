-- Create UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Base Tables

-- Tenants Table (for overarching admin access and initial setup)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evaluation Runs Table
CREATE TABLE IF NOT EXISTS evaluation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    score DECIMAL(5, 2),
    feedback TEXT,
    run_status VARCHAR(50) DEFAULT 'queued',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Artifacts Table (for output files, reports, etc.)
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
    bucket_url TEXT NOT NULL,
    artifact_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable Row-Level Security (RLS) on all operational tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies
-- The assumption here is that the application sets a session variable 'app.current_tenant_id'
-- when a request is made, based on the JWT claim.

-- Policies for users
CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- Policies for submissions
CREATE POLICY tenant_isolation_submissions ON submissions
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- Policies for evaluation_runs
CREATE POLICY tenant_isolation_eval_runs ON evaluation_runs
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- Policies for artifacts
CREATE POLICY tenant_isolation_artifacts ON artifacts
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- 4. Create indexes for performance (Tenant IDs and Foreign Keys)
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_id ON submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_tenant_id ON evaluation_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_tenant_id ON artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_eval_run_id ON artifacts(evaluation_run_id);
