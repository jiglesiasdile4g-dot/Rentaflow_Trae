-- Simplified RLS policies to allow all authenticated users to read data
-- This is a temporary solution while we clarify the user-to-data relationship

-- Enable RLS on Perfiles table
ALTER TABLE "Perfiles" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read profiles"
ON "Perfiles"
FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on Inmobiliarias table
ALTER TABLE "Inmobiliarias" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all inmobiliarias
CREATE POLICY "Allow authenticated users to read inmobiliarias"
ON "Inmobiliarias"
FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on Clientes table
ALTER TABLE "Clientes" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all clientes
CREATE POLICY "Allow authenticated users to read clientes"
ON "Clientes"
FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on Anuncios table
ALTER TABLE "Anuncios" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all anuncios
CREATE POLICY "Allow authenticated users to read anuncios"
ON "Anuncios"
FOR SELECT
TO authenticated
USING (true);
