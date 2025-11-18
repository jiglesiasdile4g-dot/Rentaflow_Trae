-- Fix the sequence for Anuncios.ida to prevent duplicate key errors
-- This resets the sequence to the maximum existing ida value + 1

-- Fixed table name to use quotes for case-sensitive PostgreSQL table name
SELECT setval(
  pg_get_serial_sequence('"Anuncios"', 'ida'),
  COALESCE((SELECT MAX(ida) FROM "Anuncios"), 0) + 1,
  false
);
