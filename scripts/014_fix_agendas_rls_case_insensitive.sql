-- Fix RLS policy for Agendas table to be case-insensitive
-- This resolves issues where user email casing (e.g. "User@Example.com") 
-- differs from the agent record (e.g. "user@example.com")

-- Enable RLS on Agendas table if not already
ALTER TABLE public."Agendas" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read agendas" ON public."Agendas";
DROP POLICY IF EXISTS "Users can manage agendas" ON public."Agendas";
DROP POLICY IF EXISTS "Users can read their own agenda" ON public."Agendas";
DROP POLICY IF EXISTS "Users can manage their own agenda" ON public."Agendas";

-- READ POLICY (Case Insensitive):
CREATE POLICY "Users can read agendas" ON public."Agendas"
    FOR SELECT
    USING (
        -- User is the agent owner (Case Insensitive Check)
        LOWER(auth.email()) IN (
            SELECT LOWER("Email") FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        -- User is Admin or Supervisor
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE LOWER("usuario") = LOWER(auth.email()) 
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    );

-- WRITE POLICY (Case Insensitive):
CREATE POLICY "Users can manage agendas" ON public."Agendas"
    FOR ALL
    USING (
        -- User is the agent owner (Case Insensitive Check)
        LOWER(auth.email()) IN (
            SELECT LOWER("Email") FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        -- User is Admin or Supervisor
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE LOWER("usuario") = LOWER(auth.email()) 
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    )
    WITH CHECK (
        -- User is the agent owner (Case Insensitive Check)
        LOWER(auth.email()) IN (
            SELECT LOWER("Email") FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        -- User is Admin or Supervisor
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE LOWER("usuario") = LOWER(auth.email()) 
            AND ("is_admin" = true OR "role" = 'supervisor' OR "role" = 'administrador')
        )
    );
