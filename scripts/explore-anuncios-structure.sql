-- Explorar estructura de tabla Anuncios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Anuncios'
ORDER BY ordinal_position;

-- Explorar estructura de tabla Clientes para ver relación con anuncios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Clientes'
ORDER BY ordinal_position;

-- Ver algunos datos de ejemplo de Anuncios
SELECT * FROM "Anuncios" LIMIT 5;

-- Ver algunos datos de ejemplo de Clientes para entender la relación
SELECT * FROM "Clientes" LIMIT 5;
