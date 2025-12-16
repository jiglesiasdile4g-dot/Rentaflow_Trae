-- Add fecha_activacion column to Anuncios table
ALTER TABLE "Anuncios" ADD COLUMN IF NOT EXISTS "fecha_activacion" TIMESTAMPTZ;

-- Optional: Update existing active ads to have fecha_activacion set to created_at or updated_at if needed, 
-- but better to leave null to respect "first activation" from now on, or set to created_at as fallback.
-- UPDATE "Anuncios" SET "fecha_activacion" = "created_at" WHERE "Activacion" = 'Activo';
