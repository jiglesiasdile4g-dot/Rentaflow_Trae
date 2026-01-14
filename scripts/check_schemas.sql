
-- Check columns in Perfiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Perfiles' 
ORDER BY ordinal_position;

-- Check columns in Agentes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Agentes' 
ORDER BY ordinal_position;
