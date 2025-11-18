-- Create a view to list available tables in the public schema
create or replace view public.available_tables as
select table_name
from information_schema.tables
where table_schema = 'public';
