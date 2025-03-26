import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { supabase } from '../config/supabaseClient';
import { format, parseISO, isBefore, parse } from 'date-fns';
import { es } from 'date-fns/locale';

function Asistencia() {
  const [dni, setDni] = useState('');
  const [alumno, setAlumno] = useState(null);
  const [pago, setPago] = useState(null);
  const [turnosRestantes, setTurnosRestantes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      if (pagoError && pagoError.code !== 'PGRST116') throw pagoError;

      // Obtener todos los turnos hasta la fecha de fin del pago
      const { data: turnosData, error: turnosError } = await supabase
        .from('turnos')
        .select('*')
        .eq('alumno_id', alumnoData.id)
        .gte('fecha', new Date().toISOString().split('T')[0]) // Solo desde hoy en adelante
        .lte('fecha', pagoData?.fecha_fin || new Date().toISOString())
        .order('fecha', { ascending: true });

      if (turnosError) throw turnosError;

      // Filtrar los turnos que ya han pasado
      const turnosFuturos = filtrarTurnosFuturos(turnosData || []);

      setAlumno(alumnoData);
      setPago(pagoData);
      setTurnosRestantes(turnosFuturos);

      // Registrar asistencia
      const { error: asistenciaError } = await supabase
        .from('asistencias')
        .insert([{
          alumno_id: alumnoData.id,
          fecha: new Date().toISOString()
        }]);

      if (asistenciaError) throw asistenciaError;

      setSuccess('Se ha registrado correctamente su asistencia');
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar la solicitud: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Registro de Asistencia
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ maxWidth: 400, mb: 3 }}>
          <TextField
            fullWidth
            label="DNI del Alumno"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={buscarAlumno}
            fullWidth
            sx={{ mt: 2 }}
          >
            Registrar Asistencia
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </Paper>

      {alumno && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Datos del Alumno
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography><strong>Nombre:</strong> {alumno.nombre}</Typography>
                <Typography><strong>DNI:</strong> {alumno.dni}</Typography>
                <Typography><strong>Email:</strong> {alumno.email}</Typography>
                <Typography><strong>Teléfono:</strong> {alumno.telefono}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                {pago ? (
                  <>
                    <Typography><strong>Estado del Plan:</strong> Activo</Typography>
                    <Typography>
                      <strong>Fecha de Vencimiento:</strong> {format(parseISO(pago.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                    </Typography>
                    <Typography>
                      <strong>Frecuencia:</strong> {pago.frecuencia} veces por semana
                    </Typography>
                    <Typography>
                      <strong>Turnos Restantes:</strong> {turnosRestantes.length}
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    No tiene un plan activo
                  </Typography>
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