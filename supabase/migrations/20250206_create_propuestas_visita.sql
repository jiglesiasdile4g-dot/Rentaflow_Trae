
-- Tabla para gestionar las propuestas de visitas grupales/masivas
create table if not exists "PropuestasVisita" (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  agente_id uuid references auth.users(id),
  inmobiliaria_id bigint, -- Referencia a Inmobiliarias(idi)
  inmueble_ref text,
  inmueble_direccion text,
  inmueble_id text, -- ID del anuncio si existe
  fecha_visita timestamp with time zone not null,
  estado text default 'pendiente', -- 'pendiente', 'reservada', 'cancelada'
  lead_adjudicado_id bigint references "Clientes"(id),
  leads_invitados jsonb default '[]'::jsonb, -- Array de IDs de leads invitados (opcional, para validación)
  notas text
);

-- Políticas RLS (Row Level Security) - Ajustar según necesidad
alter table "PropuestasVisita" enable row level security;

create policy "Usuarios autenticados pueden ver y crear propuestas"
  on "PropuestasVisita" for all
  using (auth.role() = 'authenticated');

create policy "Público puede ver propuestas (para la página de reserva)"
  on "PropuestasVisita" for select
  using (true);
