-- Add Adjuntos JSONB column to Anuncios to store file URLs

ALTER TABLE "Anuncios"
ADD COLUMN IF NOT EXISTS "Adjuntos" JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN "Anuncios"."Adjuntos" IS 'Lista de URLs/paths de archivos adjuntos (JSONB array)';