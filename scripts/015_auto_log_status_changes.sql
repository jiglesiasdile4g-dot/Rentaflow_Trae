-- Trigger to automatically log status changes made by system/external tools (like N8N)
-- This ensures that if "Estado" is updated without updating "status_history",
-- a new history entry is appended with agent "RaF".

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
DECLARE
    last_entry jsonb;
    new_entry jsonb;
BEGIN
    -- Check if status has changed
    IF NEW."Estado"::text IS DISTINCT FROM OLD."Estado"::text THEN
        -- Get the last entry from the status_history array (if it exists)
        IF NEW."status_history" IS NULL OR jsonb_array_length(NEW."status_history") = 0 THEN
            last_entry := NULL;
        ELSE
            last_entry := NEW."status_history"->-1;
        END IF;

        -- If the last entry's status does NOT match the NEW status, it means
        -- the status_history was NOT updated by the application code (which updates both).
        -- So we must append a system entry.
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_log_status_change ON "Clientes";

CREATE TRIGGER trigger_log_status_change
BEFORE UPDATE ON "Clientes"
FOR EACH ROW
EXECUTE FUNCTION public.log_status_change();
