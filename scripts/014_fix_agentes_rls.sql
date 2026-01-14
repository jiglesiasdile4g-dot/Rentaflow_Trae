-- Enable RLS on Agentes table to ensure security
ALTER TABLE public."Agentes" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can read agents" ON public."Agentes";
DROP POLICY IF EXISTS "Users can read all agents" ON public."Agentes";

-- Create policy for reading agents
-- This policy allows any authenticated user to read all agents.
-- In a stricter environment, you might want to limit this to agents in the same inmobiliaria.
CREATE POLICY "Users can read agents" ON public."Agentes"
    FOR SELECT
    TO authenticated
    USING (true);

-- Note: Management (Insert/Update/Delete) is typically done via Admin functions or specific roles.
-- If agents need to update their own profile, a policy would be needed:
-- CREATE POLICY "Agents can update own profile" ON public."Agentes"
--     FOR UPDATE
--     TO authenticated
--     USING ("Email" = auth.email())
--     WITH CHECK ("Email" = auth.email());
