-- Drop old table if exists and recreate with enhanced fields for compliance
DROP TABLE IF EXISTS public."Audit_Logs";

CREATE TABLE public."Audit_Logs" (
    id SERIAL PRIMARY KEY,
    actor_id UUID,
    actor_email VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'AUTHENTICATION', 'SENSITIVE_ACCESS', 'OPERATIONAL', 'ADMINISTRATION'
    target_object VARCHAR(255),
    action_result VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILURE'
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."Audit_Logs" ENABLE ROW LEVEL SECURITY;

-- Only admins and supervisors can read audit logs
CREATE POLICY "Admins and supervisors can view audit logs" ON public."Audit_Logs"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."Perfiles"
            WHERE "usuario" = auth.email()
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    );

-- Create index for log retention and querying
CREATE INDEX idx_audit_logs_created_at ON public."Audit_Logs"(created_at);
CREATE INDEX idx_audit_logs_category ON public."Audit_Logs"(category);
CREATE INDEX idx_audit_logs_actor_email ON public."Audit_Logs"(actor_email);
