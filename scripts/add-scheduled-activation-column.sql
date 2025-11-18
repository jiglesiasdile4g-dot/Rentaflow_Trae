-- Add Fecha_Activacion_Programada column to Anuncios table
-- This column stores the scheduled activation date/time for advertisements

ALTER TABLE "Anuncios" 
ADD COLUMN IF NOT EXISTS "Fecha_Activacion_Programada" TIMESTAMP WITH TIME ZONE;

-- Add a comment to document the column
COMMENT ON COLUMN "Anuncios"."Fecha_Activacion_Programada" IS 'Scheduled date and time for automatic advertisement activation';
