-- Script para debuggear la relación entre Anuncios y Clientes
-- Explorar estructura de ambas tablas y encontrar la relación correcta

-- Ver estructura de la tabla Anuncios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Anuncios'
ORDER BY ordinal_position;

-- Ver estructura de la tabla Clientes  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'Clientes'
ORDER BY ordinal_position;

-- Ver algunos registros de Anuncios para entender los datos
SELECT * FROM "Anuncios" LIMIT 5;

-- Ver algunos registros de Clientes para entender los datos
SELECT * FROM "Clientes" LIMIT 5;

-- Buscar posibles campos de relación en Clientes que contengan referencias a anuncios
SELECT DISTINCT 
  CASE 
    WHEN "anuncio_id" IS NOT NULL THEN 'anuncio_id encontrado'
    WHEN "AnuncioId" IS NOT NULL THEN 'AnuncioId encontrado'  
    WHEN "Anuncio_ID" IS NOT NULL THEN 'Anuncio_ID encontrado'
    WHEN "id_anuncio" IS NOT NULL THEN 'id_anuncio encontrado'
    WHEN "anuncio" IS NOT NULL THEN 'anuncio encontrado'
    WHEN "anuncio_ref" IS NOT NULL THEN 'anuncio_ref encontrado'
    WHEN "AnuncioRef" IS NOT NULL THEN 'AnuncioRef encontrado'
    WHEN "ref_anuncio" IS NOT NULL THEN 'ref_anuncio encontrado'
    WHEN "RefAnuncio" IS NOT NULL THEN 'RefAnuncio encontrado'
    WHEN "Inmueble" IS NOT NULL THEN 'Inmueble encontrado'
    ELSE 'Sin relación clara'
  END as campo_relacion
FROM "Clientes" 
LIMIT 10;

-- Contar leads por cada valor único en campos potenciales de relación
SELECT 'Por Inmueble' as tipo, "Inmueble" as valor, COUNT(*) as total_leads
FROM "Clientes" 
WHERE "Inmueble" IS NOT NULL
GROUP BY "Inmueble"
UNION ALL
SELECT 'Por anuncio_id' as tipo, "anuncio_id"::text as valor, COUNT(*) as total_leads  
FROM "Clientes"
WHERE "anuncio_id" IS NOT NULL
GROUP BY "anuncio_id"
ORDER BY total_leads DESC;
