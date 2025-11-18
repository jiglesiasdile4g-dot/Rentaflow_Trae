-- Allow unauthenticated users to read Inmobiliarias for registration
-- This is safe because we're only allowing SELECT (read) access

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their inmobiliaria or all if admin" ON "Inmobiliarias";

-- Create a new policy that allows anyone to read Inmobiliarias
-- This is needed for the registration page where users need to select an inmobiliaria
CREATE POLICY "Anyone can view inmobiliarias"
ON "Inmobiliarias" FOR SELECT
USING (true);

-- Keep the write policies restrictive (only authenticated users)
-- The INSERT, UPDATE, DELETE policies from script 007 remain unchanged
