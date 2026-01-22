-- Add duracion, gap, and announcement_id columns to Agendas table
ALTER TABLE public."Agendas" ADD COLUMN IF NOT EXISTS "duracion" INTEGER;
ALTER TABLE public."Agendas" ADD COLUMN IF NOT EXISTS "gap" INTEGER;
ALTER TABLE public."Agendas" ADD COLUMN IF NOT EXISTS "anuncio_id" INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN public."Agendas"."duracion" IS 'Duration of the visit in minutes (overrides property default)';
COMMENT ON COLUMN public."Agendas"."gap" IS 'Gap between visits in minutes (overrides property default)';
COMMENT ON COLUMN public."Agendas"."anuncio_id" IS 'Optional link to specific property (anuncio)';
