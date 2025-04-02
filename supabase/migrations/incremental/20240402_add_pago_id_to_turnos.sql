-- Agregar la columna pago_id a la tabla turnos
ALTER TABLE turnos 
ADD COLUMN pago_id UUID REFERENCES pagos(id);

-- Crear un índice para mejorar el rendimiento de las consultas por pago_id
CREATE INDEX idx_turnos_pago_id ON turnos(pago_id);

-- Comentario: Esta migración agrega una relación entre los turnos y los pagos
-- que permitirá eliminar automáticamente los turnos cuando se elimine un pago. 