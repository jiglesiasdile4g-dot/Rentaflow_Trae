-- Explorar la estructura de la tabla Clientes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Clientes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver algunos registros de ejemplo para entender los datos
SELECT * FROM "Clientes" LIMIT 5;
