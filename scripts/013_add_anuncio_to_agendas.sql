-- Add anuncio_id column to Agendas table
ALTER TABLE public."Agendas" 
ADD COLUMN IF NOT EXISTS "anuncio_id" INTEGER REFERENCES public."Anuncios"("ida") ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_agendas_anuncio_id ON public."Agendas"("anuncio_id");
