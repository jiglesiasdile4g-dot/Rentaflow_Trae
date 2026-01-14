
ALTER TABLE "Clientes" 
ADD COLUMN IF NOT EXISTS "Trabajo" text,
ADD COLUMN IF NOT EXISTS "Mascota" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "Fumador" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "Pareja" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "Niños" boolean DEFAULT false;
