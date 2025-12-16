-- Function to preserve Idealista proxy email before it gets overwritten
CREATE OR REPLACE FUNCTION public.preserve_idealista_proxy()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the old email is an Idealista proxy (contains @contacts.idealista.com)
    -- AND the new email is different (being updated)
    -- AND the current correo_proxy is empty (to avoid overwriting if already saved)
    IF OLD."Correo" ILIKE '%@contacts.idealista.com%' 
       AND NEW."Correo" IS DISTINCT FROM OLD."Correo" 
       AND (OLD."correo_proxy" IS NULL OR OLD."correo_proxy" = '') THEN
        
        NEW."correo_proxy" := OLD."Correo";
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_client_email_update_preserve_proxy ON "public"."Clientes";

CREATE TRIGGER on_client_email_update_preserve_proxy
BEFORE UPDATE OF "Correo" ON "public"."Clientes"
FOR EACH ROW
EXECUTE FUNCTION public.preserve_idealista_proxy();

-- Comment explaining what this does
COMMENT ON TRIGGER on_client_email_update_preserve_proxy ON "public"."Clientes" IS 'Preserves Idealista proxy email in correo_proxy column when Correo is updated';
