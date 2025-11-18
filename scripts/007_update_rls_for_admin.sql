-- Drop existing policies to recreate them with admin support
DROP POLICY IF EXISTS "Users can read all profiles" ON "Perfiles";
DROP POLICY IF EXISTS "Users can read all inmobiliarias" ON "Inmobiliarias";
DROP POLICY IF EXISTS "Users can read all clientes" ON "Clientes";
DROP POLICY IF EXISTS "Users can read all anuncios" ON "Anuncios";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "Perfiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "Perfiles";
DROP POLICY IF EXISTS "Users can insert inmobiliarias" ON "Inmobiliarias";
DROP POLICY IF EXISTS "Users can update inmobiliarias" ON "Inmobiliarias";
DROP POLICY IF EXISTS "Users can insert clientes" ON "Clientes";
DROP POLICY IF EXISTS "Users can update clientes" ON "Clientes";
DROP POLICY IF EXISTS "Users can delete clientes" ON "Clientes";
DROP POLICY IF EXISTS "Users can insert anuncios" ON "Anuncios";
DROP POLICY IF EXISTS "Users can update anuncios" ON "Anuncios";
DROP POLICY IF EXISTS "Users can delete anuncios" ON "Anuncios";

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "Perfiles"
    WHERE "usuario" = auth.email()
    AND "is_admin" = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- READ POLICIES (with admin bypass)

-- Perfiles: All authenticated users can read all profiles
CREATE POLICY "Users can read all profiles"
ON "Perfiles"
FOR SELECT
TO authenticated
USING (true);

-- Inmobiliarias: All authenticated users can read all inmobiliarias
CREATE POLICY "Users can read all inmobiliarias"
ON "Inmobiliarias"
FOR SELECT
TO authenticated
USING (true);

-- Clientes: Users can read all clientes (admins see all, regular users see all too for now)
CREATE POLICY "Users can read all clientes"
ON "Clientes"
FOR SELECT
TO authenticated
USING (true);

-- Anuncios: Users can read all anuncios
CREATE POLICY "Users can read all anuncios"
ON "Anuncios"
FOR SELECT
TO authenticated
USING (true);

-- WRITE POLICIES (with admin bypass)

-- Perfiles: Users can insert/update their own profile, admins can modify any
CREATE POLICY "Users can insert their own profile"
ON "Perfiles"
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR "usuario" = auth.email()
);

CREATE POLICY "Users can update their own profile"
ON "Perfiles"
FOR UPDATE
TO authenticated
USING (
  is_admin() OR "usuario" = auth.email()
)
WITH CHECK (
  is_admin() OR "usuario" = auth.email()
);

-- Inmobiliarias: Users can modify their own inmobiliaria, admins can modify any
CREATE POLICY "Users can insert inmobiliarias"
ON "Inmobiliarias"
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR 
  idi IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

CREATE POLICY "Users can update inmobiliarias"
ON "Inmobiliarias"
FOR UPDATE
TO authenticated
USING (
  is_admin() OR 
  idi IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
)
WITH CHECK (
  is_admin() OR 
  idi IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

-- Clientes: Users can modify clientes from their inmobiliaria, admins can modify any
CREATE POLICY "Users can insert clientes"
ON "Clientes"
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

CREATE POLICY "Users can update clientes"
ON "Clientes"
FOR UPDATE
TO authenticated
USING (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
)
WITH CHECK (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

CREATE POLICY "Users can delete clientes"
ON "Clientes"
FOR DELETE
TO authenticated
USING (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

-- Anuncios: Users can modify anuncios from their inmobiliaria, admins can modify any
CREATE POLICY "Users can insert anuncios"
ON "Anuncios"
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

CREATE POLICY "Users can update anuncios"
ON "Anuncios"
FOR UPDATE
TO authenticated
USING (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
)
WITH CHECK (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);

CREATE POLICY "Users can delete anuncios"
ON "Anuncios"
FOR DELETE
TO authenticated
USING (
  is_admin() OR 
  "usuario"::numeric IN (SELECT inmobiliaria FROM "Perfiles" WHERE "usuario" = auth.email())
);
