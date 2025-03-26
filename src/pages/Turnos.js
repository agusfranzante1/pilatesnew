import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  DialogContentText,
  Tooltip,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../config/supabaseClient';
import { addDays, addWeeks, format, parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import TextField from '@mui/material/TextField';

function Turnos() {
  const [turnos, setTurnos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [turnosSeleccionados, setTurnosSeleccionados] = useState([]);
  const [pagoAlumno, setPagoAlumno] = useState(null);
  const [error, setError] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [deleteRecurrent, setDeleteRecurrent] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [horariosDisponibles, setHorariosDisponibles] = useState({});

  // Horarios predeterminados (8:00 a 21:00)
  const HORARIOS = Array.from({ length: 14 }, (_, i) => {
    const hora = i + 8;
    return `${hora.toString().padStart(2, '0')}:00`;
  });

  // Días de la semana disponibles (Lunes a Viernes)
  const DIAS_SEMANA = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' }
  ];

  useEffect(() => {
    cargarTurnos();
    cargarAlumnos();
  }, []);

  // Efecto para actualizar los contadores de disponibilidad cuando cambian los turnos
  useEffect(() => {
    actualizarContadoresDisponibilidad();
  }, [turnos]);

  // Función para actualizar manualmente los contadores de disponibilidad
  const actualizarContadoresDisponibilidad = () => {
    setTimeout(() => {
      console.log('Actualizando contadores de disponibilidad...');
      
      // Enfoque directo: crear los contadores para cada celda del calendario
      // 1. Primero obtenemos las fechas de la semana actual que se muestra
      const columnasDias = document.querySelectorAll('.fc-timegrid-col[data-date]');
      const fechasDias = Array.from(columnasDias).map(col => col.getAttribute('data-date'));
      
      console.log('Fechas encontradas:', fechasDias);
      
      // 2. Obtenemos todas las horas del calendario (8:00 a 20:00)
      const horas = HORARIOS;
      
      // 3. Para cada fecha y hora, crear un contador y agregarlo manualmente
      fechasDias.forEach(fecha => {
        horas.forEach(hora => {
          // Contar los turnos para esta fecha y hora específica
          const turnosEnEsteHorario = turnos.filter(t => 
            t.fecha === fecha && t.hora === hora
          ).length;
          
          console.log(`${fecha} ${hora}: ${turnosEnEsteHorario}/5 turnos`);
          
          // Buscar la celda correcta para esta fecha y hora
          // La estructura es: .fc-timegrid-col[data-date="FECHA"] .fc-timegrid-col-frame
          const columna = document.querySelector(`.fc-timegrid-col[data-date="${fecha}"]`);
          if (!columna) return;
          
          // Hora formateada para buscar (convertir "09:00" a "0900")
          const horaFormateada = hora.replace(':', '');
          
          // Buscar la celda de esa hora específica
          const celdaHora = columna.querySelector(`.fc-timegrid-slot[data-time="${horaFormateada}"]`);
          if (!celdaHora) {
            console.log(`No se encontró celda para ${fecha} ${hora}`);
            return;
          }
          
          // Eliminar contadores existentes
          const contadoresExistentes = celdaHora.querySelectorAll('.disponibilidad-contador');
          contadoresExistentes.forEach(contador => contador.remove());
          
          // Crear nuevo contador
          const contador = document.createElement('div');
          contador.className = 'disponibilidad-contador';
          contador.style.position = 'absolute';
          contador.style.top = '5px';
          contador.style.right = '5px';
          contador.style.backgroundColor = turnosEnEsteHorario >= 5 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
          contador.style.padding = '3px 6px';
          contador.style.borderRadius = '4px';
          contador.style.fontSize = '12px';
          contador.style.fontWeight = 'bold';
          contador.style.color = turnosEnEsteHorario >= 5 ? '#ffffff' : '#000000';
          contador.style.zIndex = '1000';
          contador.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
          contador.innerText = `${turnosEnEsteHorario}/5`;
          
          celdaHora.style.position = 'relative';
          celdaHora.appendChild(contador);
        });
      });
      
      // También actualizar la vista mensual
      const celdasMes = document.querySelectorAll('.fc-daygrid-day');
      celdasMes.forEach(celda => {
        try {
          const dataDate = celda.getAttribute('data-date');
          if (dataDate) {
            const fecha = dataDate;
            const turnosDelDia = turnos.filter(t => t.fecha === fecha);
            
            // Eliminar contadores existentes
            const contadoresExistentes = celda.querySelectorAll('.disponibilidad-contador-dia');
            contadoresExistentes.forEach(contador => contador.remove());
            
            if (turnosDelDia.length > 0) {
              const contador = document.createElement('div');
              contador.className = 'disponibilidad-contador-dia';
              contador.style.position = 'absolute';
              contador.style.top = '2px';
              contador.style.right = '2px';
              contador.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
              contador.style.padding = '2px 4px';
              contador.style.borderRadius = '3px';
              contador.style.fontSize = '0.8em';
              contador.style.fontWeight = 'bold';
              contador.style.zIndex = '1';
              contador.innerText = `${turnosDelDia.length} turnos`;
              
              celda.style.position = 'relative';
              celda.appendChild(contador);
            }
          }
        } catch (err) {
          // Continuar con la siguiente celda
        }
      });
    }, 300); // Aumentar el retraso para asegurar que el calendario esté completamente renderizado
  };

  const cargarTurnos = async () => {
    try {
      const { data, error } = await supabase
        .from('turnos')
        .select(`
          id,
          alumno_id,
          fecha,
          hora,
          alumnos (
            id,
            nombre
          )
        `)
        .order('fecha', { ascending: true });

      if (error) throw error;
      console.log('Turnos cargados:', data);
      setTurnos(data || []);
      actualizarHorariosDisponibles(data || []);
    } catch (error) {
      console.error('Error al cargar turnos:', error.message);
      setError('Error al cargar los turnos: ' + error.message);
    }
  };

  const cargarAlumnos = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setAlumnos(data || []);
    } catch (error) {
      console.error('Error al cargar alumnos:', error.message);
    }
  };

  const cargarPagoAlumno = async (alumnoId) => {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', alumnoId)
        .order('fecha_inicio', { ascending: false })
        .limit(1);

      if (error) throw error;
      setPagoAlumno(data[0]);
      setSelectedAlumno(alumnoId);
      setActiveStep(1);
    } catch (error) {
      console.error('Error al cargar pago:', error.message);
      alert('Error al cargar la información del pago del alumno');
    }
  };

  const handleOpen = (info) => {
    setSelectedDate(info.date);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedAlumno('');
    setSelectedTime('');
    setActiveStep(0);
    setTurnosSeleccionados([]);
    setPagoAlumno(null);
    setError('');
  };

  const handleNext = () => {
    if (activeStep === 0) {
      cargarPagoAlumno(selectedAlumno);
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleTurnoSeleccionado = (dia, hora, index) => {
    // Verificar si el día ya está seleccionado en otro turno
    const diaYaSeleccionado = turnosSeleccionados.some((t, i) => 
      t.dia === dia && i !== index
    );

    if (diaYaSeleccionado) {
      setError('Este día ya está seleccionado en otro turno');
      return;
    }

    setError('');
    const nuevoTurno = { dia, hora };
    setTurnosSeleccionados(prev => {
      const turnosActualizados = [...prev];
      turnosActualizados[index] = nuevoTurno;
      return turnosActualizados;
    });
  };

  const verificarDisponibilidad = async (fecha, hora) => {
    try {
      const fechaFormateada = format(fecha, 'yyyy-MM-dd');
      
      // Contar directamente desde la base de datos para asegurar datos actualizados
      const { data, error, count } = await supabase
        .from('turnos')
        .select('id', { count: 'exact' })
        .eq('fecha', fechaFormateada)
        .eq('hora', hora);
      
      if (error) throw error;
      
      console.log(`Verificando disponibilidad para ${fechaFormateada} ${hora}: ${count} turnos existentes`);
      return count < 5;
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      return false;
    }
  };

  const crearTurnosRecurrentes = async () => {
    try {
      console.log('Fecha seleccionada:', selectedDate);
      console.log('Turnos seleccionados:', turnosSeleccionados);
      
      const fechaInicio = new Date(selectedDate);
      // Calcular la fecha fin: un mes más 7 días desde la fecha de inicio
      const fechaFinMes = new Date(fechaInicio);
      fechaFinMes.setMonth(fechaFinMes.getMonth() + 1);
      const fechaFin = addDays(fechaFinMes, 7);
      
      console.log('Fecha inicio:', fechaInicio);
      console.log('Fecha fin:', fechaFin);
      
      const turnosParaGuardar = [];
      const turnosNoDisponibles = [];

      // Crear turnos para cada semana
      let fechaActual = new Date(fechaInicio);
      
      while (fechaActual <= fechaFin) {
        console.log('Procesando semana, fecha actual:', fechaActual);
        
        for (const turno of turnosSeleccionados) {
          console.log('Procesando turno:', turno);
          
          let fechaTurno = new Date(fechaActual);
          const diaActualSemana = fechaTurno.getDay();
          const diaDeseado = turno.dia;
          
          let diferenciaDias;
          if (diaActualSemana === 0) {
            diferenciaDias = diaDeseado;
          } else {
            diferenciaDias = diaDeseado - diaActualSemana;
            if (diferenciaDias <= 0) {
              diferenciaDias += 7;
            }
          }
          
          fechaTurno.setDate(fechaTurno.getDate() + diferenciaDias);
          
          if (fechaTurno >= fechaInicio && fechaTurno <= fechaFin) {
            const fechaFormateada = format(fechaTurno, 'yyyy-MM-dd');
            
            // Consultar exactamente cuántos turnos existen ya para esta fecha y hora
            const { data, error, count } = await supabase
              .from('turnos')
              .select('id', { count: 'exact' })
              .eq('fecha', fechaFormateada)
              .eq('hora', turno.hora);
            
            if (error) {
              console.error('Error al verificar disponibilidad:', error);
              throw error;
            }
            
            console.log(`Turnos existentes para ${fechaFormateada} ${turno.hora}: ${count}`);
            
            // Si ya hay 5 o más turnos, no permitir agregar más
            if (count >= 5) {
              console.log(`No hay disponibilidad para ${fechaFormateada} ${turno.hora} (${count}/5 ocupados)`);
              turnosNoDisponibles.push({
                fecha: fechaFormateada,
                hora: turno.hora
              });
              continue;
            }

            const nuevoTurno = {
              alumno_id: selectedAlumno,
              fecha: fechaFormateada,
              hora: turno.hora,
            };
            turnosParaGuardar.push(nuevoTurno);
          }
        }
        
        fechaActual = addWeeks(fechaActual, 1);
      }

      if (turnosNoDisponibles.length > 0) {
        const mensaje = turnosNoDisponibles.map(t => 
          `${format(parseISO(t.fecha), 'dd/MM/yyyy', { locale: es })} a las ${t.hora}`
        ).join(', ');
        setError(`No hay disponibilidad para los siguientes horarios: ${mensaje}`);
        return;
      }

      if (turnosParaGuardar.length === 0) {
        throw new Error('No se generaron turnos para guardar. Por favor, verifica la selección de días y horarios.');
      }

      // Insertar los turnos uno por uno para evitar superar el límite de 5
      let errorAlInsertar = false;
      let turnosInsertados = [];

      for (const turnoParaGuardar of turnosParaGuardar) {
        // Verificar nuevamente la disponibilidad antes de insertar
        const { count } = await supabase
          .from('turnos')
          .select('id', { count: 'exact' })
          .eq('fecha', turnoParaGuardar.fecha)
          .eq('hora', turnoParaGuardar.hora);
        
        if (count >= 5) {
          turnosNoDisponibles.push({
            fecha: turnoParaGuardar.fecha,
            hora: turnoParaGuardar.hora
          });
          continue;
        }

        // Insertar el turno
        const { data, error } = await supabase
          .from('turnos')
          .insert([turnoParaGuardar])
          .select(`
            id,
            alumno_id,
            fecha,
            hora,
            alumnos (
              id,
              nombre
            )
          `);

        if (error) {
          errorAlInsertar = true;
          console.error('Error al insertar turno:', error);
        } else if (data && data.length > 0) {
          turnosInsertados = [...turnosInsertados, ...data];
        }
      }

      if (turnosNoDisponibles.length > 0) {
        const mensaje = turnosNoDisponibles.map(t => 
          `${format(parseISO(t.fecha), 'dd/MM/yyyy', { locale: es })} a las ${t.hora}`
        ).join(', ');
        setError(`No hay disponibilidad para los siguientes horarios: ${mensaje}`);
      }

      if (errorAlInsertar) {
        throw new Error('Hubo errores al insertar algunos turnos. Verifique los datos e intente nuevamente.');
      }

      setTurnos(prevTurnos => {
        const turnosActualizados = [...prevTurnos];
        turnosInsertados.forEach(nuevoTurno => {
          if (!turnosActualizados.some(t => t.id === nuevoTurno.id)) {
            turnosActualizados.push(nuevoTurno);
          }
        });
        return turnosActualizados;
      });

      if (turnosInsertados.length > 0) {
        handleClose();
      }
    } catch (error) {
      console.error('Error al crear turnos:', error.message);
      setError('Error al crear los turnos: ' + error.message);
    }
  };

  const contarTurnosPorHorario = (fecha, hora) => {
    return turnos.filter(t => 
      isSameDay(parseISO(t.fecha), parseISO(fecha)) && t.hora === hora
    ).length;
  };

  const renderEventContent = (eventInfo) => {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          overflow: 'hidden'
        }}>
          {eventInfo.event.title}
        </div>
      </div>
    );
  };

  const handleDatesSet = () => {
    console.log('Fechas cambiadas, actualizando contadores...');
    actualizarContadoresDisponibilidad();
  };

  const actualizarHorariosDisponibles = (turnosActuales) => {
    const disponibilidad = {};
    
    // Inicializar todos los horarios con 5 espacios disponibles
    DIAS_SEMANA.forEach(dia => {
      disponibilidad[dia.id] = {};
      HORARIOS.forEach(hora => {
        disponibilidad[dia.id][hora] = 5;
      });
    });

    // Restar los turnos ocupados
    turnosActuales.forEach(turno => {
      const fecha = parseISO(turno.fecha);
      const diaSemana = fecha.getDay();
      const hora = format(fecha, 'HH:00');
      
      if (disponibilidad[diaSemana] && disponibilidad[diaSemana][hora] > 0) {
        disponibilidad[diaSemana][hora]--;
      }
    });

    setHorariosDisponibles(disponibilidad);
  };

  const horas = Array.from({ length: 13 }, (_, i) => {
    const hora = i + 8;
    return `${hora.toString().padStart(2, '0')}:00`;
  });

  const diasSemana = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
  ];

  const steps = ['Seleccionar Alumno', 'Confirmar Pago', 'Seleccionar Turnos'];

  const handleEventClick = (info) => {
    const turno = turnos.find(t => t.id === info.event.id);
    if (turno) {
      setSelectedTurno(turno);
      setOpenDelete(true);
    }
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setSelectedTurno(null);
    setDeleteRecurrent(false);
  };

  const handleDeleteClick = () => {
    setOpenConfirmDelete(true);
  };

  const handleCloseConfirmDelete = () => {
    setOpenConfirmDelete(false);
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteRecurrent) {
        // Borrar todos los turnos recurrentes del mismo alumno en el mismo horario
        const { error } = await supabase
          .from('turnos')
          .delete()
          .eq('alumno_id', selectedTurno.alumno_id)
          .eq('hora', selectedTurno.hora)
          .gte('fecha', selectedTurno.fecha);

        if (error) throw error;
      } else {
        // Borrar solo el turno seleccionado
        const { error } = await supabase
          .from('turnos')
          .delete()
          .eq('id', selectedTurno.id);

        if (error) throw error;
      }

      // Actualizar el estado local
      setTurnos(prevTurnos => {
        if (deleteRecurrent) {
          return prevTurnos.filter(t => 
            !(t.alumno_id === selectedTurno.alumno_id && 
              t.hora === selectedTurno.hora && 
              t.fecha >= selectedTurno.fecha)
          );
        } else {
          return prevTurnos.filter(t => t.id !== selectedTurno.id);
        }
      });

      handleCloseConfirmDelete();
      handleCloseDelete();
    } catch (error) {
      console.error('Error al eliminar turno(s):', error.message);
      setError('Error al eliminar turno(s): ' + error.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Gestión de Turnos
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          events={turnos.map(turno => ({
            id: turno.id,
            title: turno.alumnos?.nombre || 'Sin nombre',
            start: `${turno.fecha}T${turno.hora}`,
            end: `${turno.fecha}T${turno.hora}`,
          }))}
          eventContent={renderEventContent}
          dateClick={handleOpen}
          height="100%"
          locale={esLocale}
          timeZone="local"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          eventClick={handleEventClick}
          slotEventOverlap={false}
          eventMaxStack={5}
          datesSet={handleDatesSet}
        />
      </Box>

      <Dialog open={openDelete} onClose={handleCloseDelete}>
        <DialogTitle>Detalles del Turno</DialogTitle>
        <DialogContent>
          {selectedTurno && (
            <List>
              <ListItem>
                <ListItemText
                  primary="Alumno"
                  secondary={selectedTurno.alumnos?.nombre}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Fecha"
                  secondary={format(parseISO(selectedTurno.fecha), 'dd/MM/yyyy', { locale: es })}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Hora"
                  secondary={selectedTurno.hora}
                />
              </ListItem>
              <ListItem>
                <FormControl fullWidth>
                  <InputLabel id="delete-type-label">Tipo de eliminación</InputLabel>
                  <Select
                    labelId="delete-type-label"
                    value={deleteRecurrent}
                    onChange={(e) => setDeleteRecurrent(e.target.value)}
                    label="Tipo de eliminación"
                  >
                    <MenuItem value={false}>Solo este turno</MenuItem>
                    <MenuItem value={true}>Este y todos los siguientes</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancelar</Button>
          <Button onClick={handleDeleteClick} color="error" startIcon={<DeleteIcon />}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmDelete} onClose={handleCloseConfirmDelete}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteRecurrent
              ? '¿Estás seguro de que deseas eliminar este turno y todos los siguientes turnos recurrentes?'
              : '¿Estás seguro de que deseas eliminar este turno?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Turno Recurrente</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {activeStep === 0 && (
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Alumno</InputLabel>
              <Select
                value={selectedAlumno}
                onChange={(e) => setSelectedAlumno(e.target.value)}
                label="Alumno"
              >
                {alumnos.map((alumno) => (
                  <MenuItem key={alumno.id} value={alumno.id}>
                    {alumno.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {activeStep === 1 && pagoAlumno && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Información del Pago
              </Typography>
              <Typography>
                Frecuencia: {pagoAlumno.frecuencia} veces por semana
              </Typography>
              <Typography>
                Fecha de inicio: {format(parseISO(pagoAlumno.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
              </Typography>
              <Typography>
                Fecha de fin: {format(parseISO(pagoAlumno.fecha_fin), 'dd/MM/yyyy', { locale: es })}
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Seleccionar Turnos
              </Typography>
              <Grid container spacing={2}>
                {Array.from({ length: pagoAlumno?.frecuencia || 0 }).map((_, index) => (
                  <Grid item xs={12} key={index}>
                    <Typography variant="subtitle1" gutterBottom>
                      Turno {index + 1}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Día de la semana</InputLabel>
                          <Select
                            value={turnosSeleccionados[index]?.dia || ''}
                            onChange={(e) => handleTurnoSeleccionado(e.target.value, turnosSeleccionados[index]?.hora || '', index)}
                            label="Día de la semana"
                          >
                            {diasSemana.map((dia) => (
                              <MenuItem key={dia.value} value={dia.value}>
                                {dia.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Hora</InputLabel>
                          <Select
                            value={turnosSeleccionados[index]?.hora || ''}
                            onChange={(e) => handleTurnoSeleccionado(turnosSeleccionados[index]?.dia || '', e.target.value, index)}
                            label="Hora"
                          >
                            {horas.map((hora) => (
                              <MenuItem key={hora} value={hora}>
                                {hora}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>Atrás</Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} variant="contained" color="primary">
              Siguiente
            </Button>
          ) : (
            <Button 
              onClick={crearTurnosRecurrentes} 
              variant="contained" 
              color="primary"
              disabled={error !== '' || turnosSeleccionados.length !== pagoAlumno?.frecuencia}
            >
              Guardar Turnos
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Turnos; 