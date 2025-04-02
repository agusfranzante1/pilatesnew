import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  Snackbar,
  IconButton
} from '@mui/material';
import { supabase } from '../config/supabaseClient';
import { format, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import CloseIcon from '@mui/icons-material/Close';

function Asistencia() {
  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [pago, setPago] = useState(null);
  const [turnosRestantes, setTurnosRestantes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Función para filtrar turnos que ya han pasado
  const filtrarTurnosFuturos = (turnos) => {
    const ahora = new Date();
    
    return turnos.filter(turno => {
      // Convertir la fecha del turno a objeto Date
      const fechaTurno = parseISO(turno.fecha);
      
      // Combinar fecha y hora del turno
      const hora = turno.hora.split(':');
      const horaNum = parseInt(hora[0], 10);
      const minNum = parseInt(hora[1], 10);
      
      // Crear una nueva fecha con la fecha y hora del turno
      const fechaHoraTurno = new Date(
        fechaTurno.getFullYear(),
        fechaTurno.getMonth(),
        fechaTurno.getDate(),
        horaNum,
        minNum
      );
      
      // Devolver true si el turno es en el futuro
      return !isBefore(fechaHoraTurno, ahora);
    });
  };

  // Función para cerrar el Snackbar
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };
  
  // Efecto para mostrar el Snackbar cuando hay un mensaje de error o éxito
  useEffect(() => {
    if (error || success) {
      setOpenSnackbar(true);
    }
  }, [error, success]);

  const buscarAlumno = async () => {
    try {
      setError('');
      setSuccess('');
      setAlumno(null);
      setPago(null);
      setTurnosRestantes([]);

      // Buscar alumno por DNI
      const { data: alumnoData, error: alumnoError } = await supabase
        .from('alumnos')
        .select('*')
        .eq('dni', dni)
        .single();

      if (alumnoError) throw alumnoError;
      if (!alumnoData) {
        setError('No se encontró ningún alumno con ese DNI');
        return;
      }

      // Buscar pago vigente
      const { data: pagoData, error: pagoError } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', alumnoData.id)
        .lte('fecha_inicio', new Date().toISOString())
        .gte('fecha_fin', new Date().toISOString())
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single();

      // Verificar si hay un pago activo
      const tienePagoActivo = pagoError === null && pagoData !== null;

      // Obtener todos los turnos hasta la fecha de fin del pago
      let turnosFuturos = [];
      
      if (tienePagoActivo) {
        const { data: turnosData, error: turnosError } = await supabase
          .from('turnos')
          .select('*')
          .eq('alumno_id', alumnoData.id)
          .gte('fecha', new Date().toISOString().split('T')[0]) // Solo desde hoy en adelante
          .lte('fecha', pagoData.fecha_fin)
          .order('fecha', { ascending: true });

        if (turnosError) throw turnosError;

        // Filtrar los turnos que ya han pasado
        turnosFuturos = filtrarTurnosFuturos(turnosData || []);
      }

      setAlumno(alumnoData);
      setPago(pagoData);
      setTurnosRestantes(turnosFuturos);

      // Solo registrar asistencia si el alumno tiene un plan activo
      if (tienePagoActivo) {
        // Registrar asistencia
        const { error: asistenciaError } = await supabase
          .from('asistencias')
          .insert([{
            alumno_id: alumnoData.id,
            fecha: new Date().toISOString()
          }]);

        if (asistenciaError) throw asistenciaError;

        setSuccess('Se ha registrado correctamente su asistencia');
        setError(''); // Limpiar errores previos
      } else {
        setError('Este alumno no tiene un plan activo. No se puede registrar la asistencia.');
        setSuccess(''); // Limpiar mensajes de éxito previos
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar la solicitud: ' + error.message);
      setSuccess(''); // Limpiar mensajes de éxito previos
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: 'primary.main' }}>
        Registro de Asistencia
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 3 }}>
        <Box sx={{ maxWidth: 500, mb: 2 }}>
          <TextField
            fullWidth
            label="DNI del Alumno"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="Ingrese el DNI del alumno"
            InputProps={{
              sx: { borderRadius: 1, fontSize: '1.1rem' }
            }}
            InputLabelProps={{
              sx: { fontSize: '1.1rem' }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={buscarAlumno}
            fullWidth
            sx={{ 
              mt: 2, 
              borderRadius: 1, 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: 2
            }}
          >
            Registrar Asistencia
          </Button>
        </Box>
      </Paper>

      {/* Snackbar para mostrar mensajes de error o éxito */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={error ? "error" : "success"} 
          variant="filled"
          sx={{ width: '100%', boxShadow: 3, fontSize: '1.1rem' }}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleCloseSnackbar}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error || success}
        </Alert>
      </Snackbar>

      {alumno && (
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 5 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
              Datos del Alumno
            </Typography>
            <Divider sx={{ mb: 3, borderColor: 'primary.light' }} />
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Información Personal</Typography>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem' }}>
                    <strong>Nombre:</strong> {alumno.nombre}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem' }}>
                    <strong>DNI:</strong> {alumno.dni}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem' }}>
                    <strong>Email:</strong> {alumno.email || '-'}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem' }}>
                    <strong>Teléfono:</strong> {alumno.telefono || '-'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Estado de Membresía</Typography>
                {pago ? (
                  <>
                    {/* Estado del plan destacado */}
                    <Box sx={{ 
                      p: 3, 
                      bgcolor: 'success.light', 
                      color: 'success.contrastText', 
                      borderRadius: 2,
                      mb: 3,
                      boxShadow: 2
                    }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                        PLAN ACTIVO
                      </Typography>
                      <Divider sx={{ my: 2, borderColor: 'success.contrastText', opacity: 0.3 }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                        VENCE: {format(parseISO(pago.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                      </Typography>
                    </Box>
                    
                    {/* Información adicional */}
                    <Box sx={{ mt: 3, ml: 2 }}>
                      <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem' }}>
                        <strong>Frecuencia:</strong> {pago.frecuencia} veces por semana
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2, fontSize: '1.1rem' }}>
                        <strong>Turnos Restantes:</strong> {turnosRestantes.length}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ 
                    p: 3, 
                    bgcolor: 'error.light', 
                    color: 'error.contrastText', 
                    borderRadius: 2,
                    boxShadow: 2
                  }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                      ¡PLAN INACTIVO!
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: 'error.contrastText', opacity: 0.3 }} />
                    <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
                      Por favor, solicite que realice un pago antes de registrar su asistencia.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Asistencia; 