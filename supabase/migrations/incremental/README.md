# Migraciones Incrementales

Este directorio contiene migraciones incrementales que deben aplicarse manualmente después de la migración inicial. Estas migraciones modifican el esquema de la base de datos para agregar nuevas funcionalidades o corregir problemas.

## Migración: Agregar pago_id a la tabla turnos

**Archivo**: `20240402_add_pago_id_to_turnos.sql`

**Propósito**: Esta migración agrega una relación entre los turnos y los pagos que permitirá eliminar automáticamente los turnos cuando se elimine un pago.

**Cómo aplicar**:

1. Inicie sesión en el dashboard de Supabase
2. Vaya a la sección SQL Editor
3. Cree un nuevo script SQL
4. Copie y pegue el contenido del archivo `20240402_add_pago_id_to_turnos.sql`
5. Ejecute el script

```sql
-- Agregar la columna pago_id a la tabla turnos
ALTER TABLE turnos 
ADD COLUMN pago_id UUID REFERENCES pagos(id);

-- Crear un índice para mejorar el rendimiento de las consultas por pago_id
CREATE INDEX idx_turnos_pago_id ON turnos(pago_id);
```

**Nota**: Esta migración no afectará a los datos existentes, pero permitirá que la aplicación guarde la relación entre turnos y pagos para los nuevos registros. 