-- Query to get all distinct Estado values from Clientes table
SELECT DISTINCT Estado, COUNT(*) as count
FROM "Clientes"
WHERE Estado IS NOT NULL
GROUP BY Estado
ORDER BY count DESC;
