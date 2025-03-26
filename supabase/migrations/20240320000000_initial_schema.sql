-- Crear tabla de alumnos
CREATE TABLE alumnos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de pagos
CREATE TABLE pagos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE,
    monto DECIMAL(10,2) NOT NULL,
    frecuencia INTEGER NOT NULL CHECK (frecuencia BETWEEN 1 AND 4),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear tabla de turnos
CREATE TABLE turnos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_pagos_alumno_id ON pagos(alumno_id);
CREATE INDEX idx_turnos_alumno_id ON turnos(alumno_id);
CREATE INDEX idx_turnos_fecha ON turnos(fecha);

-- Crear función para validar la frecuencia de turnos
CREATE OR REPLACE FUNCTION validar_frecuencia_turnos()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar que el alumno no exceda su frecuencia de turnos por semana
    IF (
        SELECT COUNT(*)
        FROM turnos t
        JOIN pagos p ON t.alumno_id = p.alumno_id
        WHERE t.alumno_id = NEW.alumno_id
        AND t.fecha >= p.fecha_inicio
        AND t.fecha <= p.fecha_fin
        AND EXTRACT(WEEK FROM t.fecha) = EXTRACT(WEEK FROM NEW.fecha)
    ) >= (
        SELECT frecuencia
        FROM pagos
        WHERE alumno_id = NEW.alumno_id
        AND NEW.fecha BETWEEN fecha_inicio AND fecha_fin
        ORDER BY created_at DESC
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'El alumno ya ha alcanzado su límite de turnos semanales';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar la frecuencia de turnos
CREATE TRIGGER validar_frecuencia_turnos_trigger
    BEFORE INSERT ON turnos
    FOR EACH ROW
    EXECUTE FUNCTION validar_frecuencia_turnos(); 