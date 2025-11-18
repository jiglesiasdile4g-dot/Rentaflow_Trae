-- Update existing users to link them to Inmobiliaria "1" (Aces Alquiler)
-- This script adds inmobiliaria_id to the user metadata for all existing users

UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      '{"inmobiliaria_id": "1"}'::jsonb
    ELSE 
      raw_user_meta_data || '{"inmobiliaria_id": "1"}'::jsonb
  END
WHERE raw_user_meta_data->>'inmobiliaria_id' IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  raw_user_meta_data->>'inmobiliaria_id' as inmobiliaria_id,
  raw_user_meta_data
FROM auth.users;
