-- ==============================================================================
-- 02_mlops_schema.sql
-- Extension mapping pedagogical LLM generations and MLOps feedback mechanisms.
-- ==============================================================================

-- 1. Create the Immutable LLM Audit Logs Table
CREATE TABLE IF NOT EXISTS public.llm_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    evaluation_run_id UUID NOT NULL REFERENCES public.evaluation_runs(id) ON DELETE CASCADE,
    
    -- Context Provided to Model
    system_prompt TEXT NOT NULL,
    user_context JSONB NOT NULL,
    
    -- Model Output
    llm_response JSONB NOT NULL,
    
    -- Human-in-the-loop (HITL) Feedback fields (nullable until reviewed)
    teacher_rating INTEGER CHECK (teacher_rating >= 1 AND teacher_rating <= 5),
    hallucination_flag BOOLEAN DEFAULT FALSE,
    reviewer_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: No UPDATE triggers allowed on system_prompt/user_context/llm_response 
-- to enforce cryptographic immutability, though standard Postgres roles 
-- typically control this at the application layer.

-- 2. Row Level Security Profile Extensions
ALTER TABLE public.llm_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only view the LLM feedback logs generated for their own evaluations.
CREATE POLICY tenant_isolation_policy_llm_logs ON public.llm_audit_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policy Admin override for deep telemetry debugging.
CREATE POLICY admin_telemetry_policy ON public.llm_audit_logs
    FOR ALL
    USING (current_setting('app.current_role') = 'superadmin');

-- 3. Indexes for fast aggregation in the MLOps dashboard
CREATE INDEX idx_llm_logs_tenant ON public.llm_audit_logs(tenant_id);
CREATE INDEX idx_llm_logs_eval ON public.llm_audit_logs(evaluation_run_id);
CREATE INDEX idx_llm_logs_hallucination ON public.llm_audit_logs(tenant_id) WHERE hallucination_flag = TRUE;
