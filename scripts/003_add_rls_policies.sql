-- Enable RLS on Perfiles table
ALTER TABLE "Perfiles" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles
-- (You can make this more restrictive later if needed)
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

-- Updated to use "usuario" field instead of "inmobiliaria" in Clientes table
-- Enable RLS on Clientes table
ALTER TABLE "Clientes" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own clientes (matched by usuario field)
CREATE POLICY "Allow users to read their own clientes"
ON "Clientes"
FOR SELECT
TO authenticated
USING (
  usuario = auth.jwt() ->> 'email'
);

-- Enable RLS on Anuncios table
ALTER TABLE "Anuncios" ENABLE ROW LEVEL SECURITY;

-- Added explicit type casting to numeric to fix type comparison error
-- Allow authenticated users to read anuncios from their inmobiliaria
CREATE POLICY "Allow users to read anuncios from their inmobiliaria"
ON "Anuncios"
FOR SELECT
TO authenticated
USING (
  inmobiliaria::numeric IN (
    SELECT inmobiliaria::numeric
    FROM "Perfiles" 
    WHERE usuario = auth.jwt() ->> 'email'
  )
);
