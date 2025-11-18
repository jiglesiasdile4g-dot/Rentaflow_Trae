-- Explorar estructura de tabla Anuncios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Anuncios'
ORDER BY ordinal_position;

-- Explorar estructura de tabla Clientes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Clientes'
ORDER BY ordinal_position;

-- Buscar posibles campos de relación en Clientes que contengan 'anuncio'
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'Clientes' 
AND LOWER(column_name) LIKE '%anuncio%';

-- Mostrar algunos registros de ejemplo de Anuncios
SELECT * FROM "Anuncios" LIMIT 5;

-- Mostrar algunos registros de ejemplo de Clientes con campos que puedan relacionarse
SELECT "ID", "Estado", "created_at", 
       CASE 
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'Clientes' AND column_name = 'anuncio_id') THEN "anuncio_id"
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'Clientes' AND column_name = 'AnuncioId') THEN "AnuncioId"
         WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'Clientes' AND column_name = 'Anuncio_ID') THEN "Anuncio_ID"
         ELSE NULL
       END as anuncio_ref
FROM "Clientes" 
LIMIT 5;
