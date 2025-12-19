-- Add fecha column to Agendas table for specific date scheduling
ALTER TABLE public."Agendas" ADD COLUMN IF NOT EXISTS "fecha" DATE;

-- Make dia_semana optional since we are moving to date-based scheduling
ALTER TABLE public."Agendas" ALTER COLUMN "dia_semana" DROP NOT NULL;

-- Add index for fecha for faster queries
CREATE INDEX IF NOT EXISTS idx_agendas_fecha ON public."Agendas"("fecha");

-- Optional: If you want to migrate existing data, you might need a strategy, 
-- but for now we assume new data will be entered.
