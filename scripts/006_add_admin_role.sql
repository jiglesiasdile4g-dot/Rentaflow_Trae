-- Add admin role to Perfiles table
ALTER TABLE "Perfiles" 
ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN DEFAULT FALSE;

-- Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_perfiles_is_admin ON "Perfiles"("is_admin");

-- Comment: To make a user an admin, run:
-- UPDATE "Perfiles" SET "is_admin" = TRUE WHERE "usuario" = 'admin@example.com';
