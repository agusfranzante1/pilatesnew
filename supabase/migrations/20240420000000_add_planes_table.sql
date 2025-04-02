-- Crear la tabla de planes
CREATE TABLE IF NOT EXISTS public.planes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    nombre text NOT NULL,
    descripcion text,
    precio numeric NOT NULL,
    frecuencia integer NOT NULL,
    duracion_dias integer NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT planes_pkey PRIMARY KEY (id)
);

ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden leer planes" 
ON public.planes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Los usuarios autenticados pueden insertar planes" 
ON public.planes FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Los usuarios autenticados pueden actualizar planes" 
ON public.planes FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Los usuarios autenticados pueden eliminar planes" 
ON public.planes FOR DELETE 
TO authenticated 
USING (true);

-- Añadir columna plan_id a la tabla pagos
ALTER TABLE public.pagos 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.planes(id);

-- Crear índice para mejorar el rendimiento de las consultas que involucran plan_id
CREATE INDEX IF NOT EXISTS pagos_plan_id_idx ON public.pagos(plan_id); 