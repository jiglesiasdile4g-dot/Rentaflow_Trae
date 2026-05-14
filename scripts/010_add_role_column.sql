-- Add role column to Perfiles table
ALTER TABLE "Perfiles" 
ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) DEFAULT 'agente';

-- Create index for faster role checks
CREATE INDEX IF NOT EXISTS idx_perfiles_role ON "Perfiles"("role");

-- Migrate existing data based on is_admin
UPDATE "Perfiles" 
SET "role" = CASE 
  WHEN "is_admin" = TRUE THEN 'superuser'
  ELSE 'agente'
END
WHERE "role" IS NULL OR "role" = 'agente';

-- is_admin is reserved for Superusuario only. Do not auto-sync it from tenant roles.
DROP TRIGGER IF EXISTS trigger_sync_admin_flag ON "Perfiles";
DROP TRIGGER IF EXISTS trigger_sync_role_from_admin ON "Perfiles";
DROP FUNCTION IF EXISTS sync_admin_flag();
DROP FUNCTION IF EXISTS sync_role_from_admin();
