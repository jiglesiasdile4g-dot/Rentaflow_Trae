-- Fix for "operator does not exist: text = estado_enum" error
-- This error occurs because the trigger compares a JSON text value with an Enum column directly.
-- We cast the Enum to text for the comparison.

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
DECLARE
    last_entry jsonb;
    new_entry jsonb;
BEGIN
    -- Check if status has changed
    -- Casting to text is safe and ensures compatibility
    IF NEW."Estado"::text IS DISTINCT FROM OLD."Estado"::text THEN
        -- Get the last entry from the status_history array (if it exists)
        IF NEW."status_history" IS NULL OR jsonb_array_length(NEW."status_history") = 0 THEN
            last_entry := NULL;
        ELSE
            last_entry := NEW."status_history"->-1;
        END IF;

        -- FIX: Compare last history entry status (text) with new Estado (enum cast to text)
        -- explicitly casting NEW."Estado" to text prevents the type mismatch error.
        IF last_entry IS NULL OR (last_entry->>'status') IS DISTINCT FROM NEW."Estado"::text THEN
            new_entry := jsonb_build_object(
                'status', NEW."Estado",
                'timestamp', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'agent_id', 'system',
                'agent_name', 'RaF'
            );

            IF NEW."status_history" IS NULL THEN
                NEW."status_history" := jsonb_build_array(new_entry);
            ELSE
                NEW."status_history" := NEW."status_history" || new_entry;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is active (no change needed to trigger definition, just the function)
