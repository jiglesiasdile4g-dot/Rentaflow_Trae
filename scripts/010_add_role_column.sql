-- Add role column to Perfiles table
ALTER TABLE "Perfiles" 
ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) DEFAULT 'agente';

-- Create index for faster role checks
CREATE INDEX IF NOT EXISTS idx_perfiles_role ON "Perfiles"("role");

-- Migrate existing data based on is_admin
UPDATE "Perfiles" 
SET "role" = CASE 
  WHEN "is_admin" = TRUE THEN 'administrador'
  ELSE 'agente'
END
WHERE "role" IS NULL OR "role" = 'agente';

-- Create function to keep is_admin synced with role (for backward compatibility)
CREATE OR REPLACE FUNCTION sync_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'administrador' THEN
    NEW.is_admin := TRUE;
  ELSE
    NEW.is_admin := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update is_admin when role changes
DROP TRIGGER IF EXISTS trigger_sync_admin_flag ON "Perfiles";
CREATE TRIGGER trigger_sync_admin_flag
BEFORE INSERT OR UPDATE OF "role" ON "Perfiles"
FOR EACH ROW
EXECUTE FUNCTION sync_admin_flag();

-- Create function to keep role synced with is_admin (bi-directional sync)
CREATE OR REPLACE FUNCTION sync_role_from_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin = TRUE AND OLD.is_admin = FALSE THEN
    NEW.role := 'administrador';
  ELSIF NEW.is_admin = FALSE AND OLD.is_admin = TRUE AND NEW.role = 'administrador' THEN
    NEW.role := 'agente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for is_admin changes
DROP TRIGGER IF EXISTS trigger_sync_role_from_admin ON "Perfiles";
CREATE TRIGGER trigger_sync_role_from_admin
BEFORE UPDATE OF "is_admin" ON "Perfiles"
FOR EACH ROW
EXECUTE FUNCTION sync_role_from_admin();
