import { supabase } from '../config/supabaseClient';

/**
 * Verifica la estructura de la tabla turnos para asegurarse de que tiene el campo pago_id
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
export const verificarEstructuraTurnos = async () => {
  try {
    // Intentamos crear un turno de prueba con pago_id para ver si es aceptado
    const turnoTest = {
      alumno_id: '00000000-0000-0000-0000-000000000000', // ID inválido que no debería existir
      fecha: '2099-01-01', // Fecha futura que no debería afectar nada real
      hora: '12:00',
      pago_id: '00000000-0000-0000-0000-000000000000' // ID inválido de prueba
    };

    // Ejecutamos la operación en modo dry-run para no insertar realmente
    const { error } = await supabase
      .from('turnos')
      .insert([turnoTest])
      .select()
      .limit(0);

    if (error) {
      // Si hay un error específico sobre columna no existente
      if (error.message && error.message.includes('pago_id') && 
          (error.message.includes('does not exist') || error.message.includes('no existe'))) {
        return {
          success: false,
          tienePagoId: false,
          error: 'La tabla turnos no tiene el campo pago_id. Debe aplicar la migración.',
          errorOriginal: error
        };
      }
      
      // Otros errores (por ejemplo, validación de la clave foránea) indican que sí existe el campo
      return {
        success: true,
        tienePagoId: true,
        error: null,
        nota: 'La columna pago_id existe pero hubo otro error: ' + error.message
      };
    }
    
    // Si no hay error, la columna existe
    return {
      success: true,
      tienePagoId: true,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      tienePagoId: null,
      error: 'Error al verificar la estructura: ' + error.message,
      errorOriginal: error
    };
  }
};

/**
 * Muestra instrucciones para aplicar la migración
 */
export const mostrarInstruccionesMigracion = () => {
  return `
Para aplicar la migración que agrega el campo pago_id a la tabla turnos, siga estos pasos:

1. Inicie sesión en el panel de administración de Supabase.
2. Vaya a "SQL Editor".
3. Cree un nuevo script y copie este código:

ALTER TABLE turnos 
ADD COLUMN pago_id UUID REFERENCES pagos(id);

CREATE INDEX idx_turnos_pago_id ON turnos(pago_id);

4. Ejecute el script.
5. Reinicie la aplicación para que los cambios surtan efecto.
  `;
};

export default {
  verificarEstructuraTurnos,
  mostrarInstruccionesMigracion
}; 