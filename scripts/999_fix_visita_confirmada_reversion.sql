
-- Fix for 'Visita Confirmada' reversion issue
-- Problem: A hidden trigger forces status to 'Visita Propuesta' when 'fecha_de_visita' is in the future.
-- Solution: Add a final trigger that runs AFTER the culprit and restores 'Visita Confirmada' if valid.

CREATE OR REPLACE FUNCTION public.fix_visita_confirmada_reversion()
RETURNS TRIGGER AS $$
BEGIN
    -- If the status is 'Visita Propuesta' (reverted by culprit)
    -- BUT 'visita_completada' flag is explicitly 'visita confirmada' (set by our code)
    -- AND we have a valid visit date
    -- THEN assume it was meant to be 'Visita Confirmada'.
    IF NEW."Estado" = 'Visita Propuesta' 
       AND NEW."visita_completada" = 'visita confirmada' 
       AND NEW."fecha_de_visita" IS NOT NULL THEN
        
        NEW."Estado" := 'Visita Confirmada';
        NEW."visita_propuesta" := FALSE;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists
DROP TRIGGER IF EXISTS zz_fix_visita_confirmada ON "Clientes";

-- Create trigger to run BEFORE UPDATE
-- 'zz_' prefix ensures it runs alphabetically LAST, after the culprit trigger.
CREATE TRIGGER zz_fix_visita_confirmada
BEFORE UPDATE ON "Clientes"
FOR EACH ROW
EXECUTE FUNCTION public.fix_visita_confirmada_reversion();

COMMENT ON TRIGGER zz_fix_visita_confirmada ON "Clientes" IS 'Forces Visita Confirmada status if visita_propuesta is false, fixing unwanted reversion by other triggers.';
