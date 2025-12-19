-- Create Agendas table to store agent availability
CREATE TABLE IF NOT EXISTS public."Agendas" (
    "id" SERIAL PRIMARY KEY,
    "agente_id" INTEGER NOT NULL REFERENCES public."Agentes"("idag") ON DELETE CASCADE,
    "dia_semana" INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT "check_horario" CHECK ("hora_fin" > "hora_inicio")
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agendas_agente_id ON public."Agendas"("agente_id");
CREATE INDEX IF NOT EXISTS idx_agendas_dia_semana ON public."Agendas"("dia_semana");

-- Enable RLS
ALTER TABLE public."Agendas" ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (Agents can read their own, Admins can read all)
CREATE POLICY "Users can read their own agenda" ON public."Agendas"
    FOR SELECT
    USING (
        auth.email() IN (
            SELECT "Email" FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
        OR 
        EXISTS (
            SELECT 1 FROM public."Perfiles" 
            WHERE "usuario" = auth.email() AND "is_admin" = true
        )
    );

-- Create policy for inserting/updating/deleting (Agents can manage their own)
CREATE POLICY "Users can manage their own agenda" ON public."Agendas"
    FOR ALL
    USING (
        auth.email() IN (
            SELECT "Email" FROM public."Agentes" WHERE "idag" = "Agendas"."agente_id"
        )
    );
