ALTER TABLE public."Inmobiliarias" ADD COLUMN IF NOT EXISTS "PlanNext" integer;
ALTER TABLE public."Inmobiliarias" ADD COLUMN IF NOT EXISTS "PlanNextEffectiveAt" timestamptz;