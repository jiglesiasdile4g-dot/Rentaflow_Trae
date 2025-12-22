-- Enable RLS on Agendas table if not already
ALTER TABLE public."Agendas" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with expanded permissions
DROP POLICY IF EXISTS "Users can read their own agenda" ON public."Agendas";
DROP POLICY IF EXISTS "Users can manage their own agenda" ON public."Agendas";

-- READ POLICY:
-- Agents can read their own agenda.
-- Admins and Supervisors can read ALL agendas.
CREATE POLICY "Users can read agendas" ON public."Agendas"
    FOR SELECT
    USING (
        -- User is the agent owner
        auth.email() IN (
            SELECT "Email" FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        -- User is Admin or Supervisor
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE "usuario" = auth.email() 
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    );

-- WRITE POLICY (Insert, Update, Delete):
-- Agents can manage their own agenda.
-- Admins and Supervisors can manage ALL agendas.
CREATE POLICY "Users can manage agendas" ON public."Agendas"
    FOR ALL
    USING (
        -- User is the agent owner
        auth.email() IN (
            SELECT "Email" FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        -- User is Admin or Supervisor
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE "usuario" = auth.email() 
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    )
    WITH CHECK (
        -- User is the agent owner
        auth.email() IN (
            SELECT "Email" FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        -- User is Admin or Supervisor
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE "usuario" = auth.email() 
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    );
