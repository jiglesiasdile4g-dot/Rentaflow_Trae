-- Add duration and gap columns to Anuncios table
ALTER TABLE public."Anuncios" 
ADD COLUMN IF NOT EXISTS "duracion_visita" INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS "tiempo_entre_visitas" INTEGER DEFAULT 5;

-- Update existing records if needed (optional, defaults handle new ones)
-- UPDATE public."Anuncios" SET "duracion_visita" = 20, "tiempo_entre_visitas" = 5 WHERE "duracion_visita" IS NULL;
