-- Create Audit Logs table to track user administration changes
CREATE TABLE IF NOT EXISTS public."Audit_Logs" (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    target_email VARCHAR(255) NOT NULL,
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

-- Only service role (admin client) can insert into audit logs, so no insert policy needed for regular users.
