-- Add INSERT, UPDATE, and DELETE policies for all tables
-- This allows authenticated users to write data to the database

-- ============================================
-- PERFILES TABLE - Write Policies
-- ============================================

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON "Perfiles"
FOR INSERT
TO authenticated
WITH CHECK (usuario = auth.email());

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
ON "Perfiles"
FOR UPDATE
TO authenticated
USING (usuario = auth.email())
WITH CHECK (usuario = auth.email());

-- ============================================
-- INMOBILIARIAS TABLE - Write Policies
-- ============================================

-- Allow authenticated users to insert inmobiliarias
CREATE POLICY "Users can insert inmobiliarias"
ON "Inmobiliarias"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own inmobiliaria
CREATE POLICY "Users can update their inmobiliaria"
ON "Inmobiliarias"
FOR UPDATE
TO authenticated
USING (
  idi IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
)
WITH CHECK (
  idi IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- ============================================
-- CLIENTES TABLE - Write Policies
-- ============================================

-- Allow authenticated users to insert clientes for their inmobiliaria
CREATE POLICY "Users can insert clientes for their inmobiliaria"
ON "Clientes"
FOR INSERT
TO authenticated
WITH CHECK (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- Allow authenticated users to update clientes from their inmobiliaria
CREATE POLICY "Users can update their inmobiliaria clientes"
ON "Clientes"
FOR UPDATE
TO authenticated
USING (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
)
WITH CHECK (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- Allow authenticated users to delete clientes from their inmobiliaria
CREATE POLICY "Users can delete their inmobiliaria clientes"
ON "Clientes"
FOR DELETE
TO authenticated
USING (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- ============================================
-- ANUNCIOS TABLE - Write Policies
-- ============================================

-- Allow authenticated users to insert anuncios for their inmobiliaria
CREATE POLICY "Users can insert anuncios for their inmobiliaria"
ON "Anuncios"
FOR INSERT
TO authenticated
WITH CHECK (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- Allow authenticated users to update anuncios from their inmobiliaria
CREATE POLICY "Users can update their inmobiliaria anuncios"
ON "Anuncios"
FOR UPDATE
TO authenticated
USING (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
)
WITH CHECK (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- Allow authenticated users to delete anuncios from their inmobiliaria
CREATE POLICY "Users can delete their inmobiliaria anuncios"
ON "Anuncios"
FOR DELETE
TO authenticated
USING (
  usuario IN (
    SELECT inmobiliaria 
    FROM "Perfiles" 
    WHERE usuario = auth.email()
  )
);

-- ============================================
-- CORREOS TABLE - Write Policies (if exists)
-- ============================================

-- Note: Add policies for Correos table if it exists
-- Uncomment and adjust these if you have a Correos table:

-- CREATE POLICY "Users can insert correos for their inmobiliaria"
-- ON "Correos"
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   usuario IN (
--     SELECT inmobiliaria 
--     FROM "Perfiles" 
--     WHERE usuario = auth.email()
--   )
-- );

-- CREATE POLICY "Users can update their inmobiliaria correos"
-- ON "Correos"
-- FOR UPDATE
-- TO authenticated
-- USING (
--   usuario IN (
--     SELECT inmobiliaria 
--     FROM "Perfiles" 
--     WHERE usuario = auth.email()
--   )
-- )
-- WITH CHECK (
--   usuario IN (
--     SELECT inmobiliaria 
--     FROM "Perfiles" 
--     WHERE usuario = auth.email()
--   )
-- );

-- CREATE POLICY "Users can delete their inmobiliaria correos"
-- ON "Correos"
-- FOR DELETE
-- TO authenticated
-- USING (
--   usuario IN (
--     SELECT inmobiliaria 
--     FROM "Perfiles" 
--     WHERE usuario = auth.email()
--   )
-- );
