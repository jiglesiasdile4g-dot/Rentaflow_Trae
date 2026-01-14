
-- Add logo_url column to Inmobiliarias table
ALTER TABLE public."Inmobiliarias" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
