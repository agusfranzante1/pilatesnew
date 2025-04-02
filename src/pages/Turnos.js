import React, { useState, useEffect, useRef } from 'react';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLocation } from 'react-router-dom';

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
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const location = useLocation();
  const calendarRef = useRef(null);

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
    console.log('Componente Turnos montado');
    cargarTurnos();
    cargarAlumnos();
    
    // Establecer un intervalo para actualizar los turnos automáticamente cada 30 segundos
    const intervalo = setInterval(() => {
      console.log('Actualizando turnos automáticamente...');
      cargarTurnos();
    }, 30000);
    
    // Suscribirse a cambios en la tabla de turnos
    const channel = supabase.channel('turnos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turnos',
        },
        (payload) => {
          console.log('Cambio detectado en turnos:', payload);
          cargarTurnos();
        }
      )
      .subscribe((status) => {
        console.log('Status de suscripción de turnos:', status);
      });
    
    // Agregar listener para el evento personalizado de actualización de turnos
    const handleTurnosActualizados = (event) => {
      console.log('Evento de turnos actualizados recibido:', event.detail);
      cargarTurnos();
    };
    
    window.addEventListener('turnosActualizados', handleTurnosActualizados);
    
    // Limpiar el intervalo, la suscripción y el listener al desmontar el componente
    return () => {
      console.log('Componente Turnos desmontado');
      clearInterval(intervalo);
      channel.unsubscribe();
      window.removeEventListener('turnosActualizados', handleTurnosActualizados);
    };
  }, []);

  // Efecto para actualizar los contadores de disponibilidad cuando cambian los turnos
  useEffect(() => {
    actualizarContadoresDisponibilidad();
  }, [turnos]);

  // Efecto para detectar cuando el usuario regresa a la página
  useEffect(() => {
    // Recargar turnos cada vez que el usuario navega a esta página
    cargarTurnos();
  }, [location]);

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
          // Seleccionamos la celda que contiene los eventos
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
          
          // Asegurar que la celda tenga position relative para que el contador se posicione correctamente
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
          console.error('Error al actualizar contador de día:', err);
          // Continuar con la siguiente celda
        }
      });
    }, 500); // Aumentar el retraso para asegurar que el calendario esté completamente renderizado
  };

  const cargarTurnos = async () => {
    try {
      console.log('Cargando turnos...');
      
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
      
      console.log('Total de turnos cargados:', data?.length || 0);
      console.log('Datos de turnos cargados:', data);
      
      // Verificar si hay turnos para Agustín Franzante (para depuración)
      const turnosFranzante = data?.filter(turno => 
        turno.alumnos?.nombre?.includes('Franzante') || 
        turno.alumnos?.nombre?.includes('FRANZANTE') || 
        turno.alumnos?.nombre?.includes('franzante')
      );
      
      if (turnosFranzante && turnosFranzante.length > 0) {
        console.log('Turnos encontrados para Franzante:', turnosFranzante.length);
        console.log('Detalle de turnos de Franzante:', turnosFranzante);
      } else {
        console.log('No se encontraron turnos para Franzante');
      }
      
      // Guardar todos los turnos originales para otras operaciones
      setTurnos(data || []);
      
      // Agrupar los turnos por fecha y hora
      const turnosAgrupados = {};
      
      data.forEach(turno => {
        // Asegurarse de que el turno tenga fecha y hora
        if (!turno.fecha || !turno.hora) {
          console.warn('Turno sin fecha o hora:', turno);
          return;
        }
        
        const key = `${turno.fecha}-${turno.hora}`;
        if (!turnosAgrupados[key]) {
          turnosAgrupados[key] = {
            fecha: turno.fecha,
            hora: turno.hora,
            turnos: []
          };
        }
        turnosAgrupados[key].turnos.push(turno);
      });
      
      // Crear eventos individuales para el calendario
      const todosLosEventos = [];
      
      Object.values(turnosAgrupados).forEach(grupo => {
        const cantidadTurnos = grupo.turnos.length;
        
        // Depurar los grupos por fecha
        console.log(`Grupo: ${grupo.fecha} ${grupo.hora} - ${cantidadTurnos} turnos`);
        
        // Primero, agregar un evento para cada turno real
        grupo.turnos.forEach((turno, i) => {
          todosLosEventos.push({
            id: turno.id.toString(),
            title: turno.alumnos?.nombre || 'Sin nombre',
            start: `${turno.fecha}T${turno.hora}`,
            end: `${turno.fecha}T${turno.hora}`,
            backgroundColor: '#1976d2',
            borderColor: '#1976d2',
            textColor: '#ffffff',
            display: 'auto',
            extendedProps: {
              alumnoId: turno.alumno_id,
              grupoId: `${turno.fecha}-${turno.hora}`,
              turnoCompleto: turno,
              esReal: true,
              cantidad: cantidadTurnos
            }
          });
        });
        
        // Si solo hay 1 turno, agregar un evento fantasma para forzar el "+más"
        if (cantidadTurnos === 1) {
          const turno = grupo.turnos[0];
          todosLosEventos.push({
            id: `fantasma-${grupo.fecha}-${grupo.hora}`,
            title: "", // Título vacío para que no aparezca en el popover
            start: `${grupo.fecha}T${turno.hora}`,
            end: `${grupo.fecha}T${turno.hora}`,
            display: 'background', // Usar display background para que no aparezca en el popover
            backgroundColor: 'transparent', // Hacerlo transparente
            borderColor: 'transparent',
            textColor: 'transparent',
            extendedProps: {
              grupoId: `${turno.fecha}-${turno.hora}`,
              esFantasma: true,
              cantidad: cantidadTurnos
            },
            classNames: ['evento-fantasma'] // Agregar clase para poder ocultarlo con CSS
          });
        }
      });
      
      console.log('Total de eventos generados para el calendario:', todosLosEventos.length);
      
      // Usar los eventos para el calendario
      setEventosCalendario(todosLosEventos);
      actualizarHorariosDisponibles(data || []);
      
      // Forzar una actualización del calendario si existe
      if (calendarRef.current) {
        console.log('Forzando actualización del calendario');
        const calendarApi = calendarRef.current.getApi();
        calendarApi.refetchEvents();
      }
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
    // Mostrar un mensaje informativo en lugar de abrir el diálogo
    setError('La creación de turnos ahora se realiza desde la sección de Pagos. Por favor, cree un pago y seleccione los días y horarios para generar turnos automáticamente.');
    // No abrir el diálogo
    // setOpen(true);
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
      
      // Verificar si el alumno tiene un pago activo
      const fechaHoy = format(new Date(), 'yyyy-MM-dd');
      let pagoId = null;
      
      // Obtener pago activo del alumno para la fecha actual
      const { data: pagoActivo, error: pagoError } = await supabase
        .from('pagos')
        .select('id')
        .eq('alumno_id', selectedAlumno)
        .lte('fecha_inicio', fechaHoy)
        .gte('fecha_fin', fechaHoy)
        .order('fecha_fin', { ascending: false })
        .limit(1);
      
      if (pagoError) {
        console.error('Error al buscar pago activo:', pagoError);
      } else if (pagoActivo && pagoActivo.length > 0) {
        pagoId = pagoActivo[0].id;
        console.log('Pago activo encontrado:', pagoId);
      } else {
        console.log('No se encontró un pago activo para este alumno');
      }
      
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
            
            // Si existe un pago activo, asociarlo con el turno
            if (pagoId) {
              nuevoTurno.pago_id = pagoId;
            }
            
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
        try {
          const { data, error } = await supabase
            .from('turnos')
            .insert([turnoParaGuardar])
            .select(`
              id,
              alumno_id,
              fecha,
              hora,
              pago_id,
              alumnos (
                id,
                nombre
              )
            `);

          if (error) {
            errorAlInsertar = true;
            console.error('Error detallado al insertar turno:', error);
            console.error('Código:', error.code);
            console.error('Mensaje:', error.message);
            console.error('Detalles:', error.details);
            console.error('Pista:', error.hint);
            console.error('Turno que se intentó guardar:', turnoParaGuardar);
          } else if (data && data.length > 0) {
            turnosInsertados = [...turnosInsertados, ...data];
          }
        } catch (innerError) {
          errorAlInsertar = true;
          console.error('Error al insertar turno:', innerError);
        }
      }

      if (turnosNoDisponibles.length > 0) {
        const mensaje = turnosNoDisponibles.map(t => 
          `${format(parseISO(t.fecha), 'dd/MM/yyyy', { locale: es })} a las ${t.hora}`
        ).join(', ');
        setError(`No hay disponibilidad para los siguientes horarios: ${mensaje}`);
      }

      if (errorAlInsertar) {
        const errorMsg = 'Hubo errores al insertar algunos turnos. Por favor revise los datos y compruebe que la tabla turnos tiene el campo pago_id.';
        console.error(errorMsg);
        console.error('Verify if migration has been applied to add pago_id field to turnos table');
        throw new Error(errorMsg);
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
    const cantidad = eventInfo.event.extendedProps?.cantidad || 0;
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: '#1976d2',
        borderRadius: '4px',
        color: 'white',
        padding: '2px 4px',
        fontSize: '0.85em'
      }}>
        {eventInfo.event.title}
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
    // Obtener el turno completo desde las propiedades extendidas
    const turnoCompleto = info.event.extendedProps?.turnoCompleto;
    
    if (turnoCompleto) {
      setSelectedTurno(turnoCompleto);
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

  const handleDateClick = (info) => {
    // Mostrar un mensaje informativo indicando que la funcionalidad de creación de turnos
    // ahora está disponible en la sección de Pagos
    setError('La creación de turnos recurrentes ahora se realiza desde la sección de Pagos. Por favor, cree un nuevo pago y seleccione la opción "Generar turnos automáticamente".');
    
    // No abrir el diálogo de creación de turnos
    // setOpen(true);
    // setSelectedDate(info.date);
  };

  const handleOpenDialog = () => {
    // Mostrar un mensaje informativo indicando que la funcionalidad de creación de turnos
    // ahora está disponible en la sección de Pagos
    setError('La creación de turnos recurrentes ahora se realiza desde la sección de Pagos. Por favor, cree un nuevo pago y seleccione la opción "Generar turnos automáticamente".');
    
    // No abrir el diálogo de creación de turnos
    // setOpen(true);
  };

  // Función para recargar los turnos manualmente
  const recargarTurnos = () => {
    console.log('Recargando turnos manualmente...');
    cargarTurnos();
    
    // También forzar una actualización de la UI
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.refetchEvents();
      calendarApi.render(); // Forzar renderizado completo
      setTimeout(actualizarContadoresDisponibilidad, 500);
    }
  };

  // Función para manejar el montaje de eventos en el calendario
  const handleEventoMontado = (info) => {
    const { event } = info;
    
    // Añadir información al elemento del evento solo si es un evento real
    if (event.extendedProps.esReal && !event.extendedProps.esFantasma) {
      // Mostrar información adicional en los tooltips
      info.el.title = `${event.title} - ${event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}`;
      
      // Añadir clases para mejorar la visualización
      info.el.classList.add('turno-real');
    }
    
    // Ocultar los eventos fantasma
    if (event.extendedProps.esFantasma) {
      info.el.style.display = 'none';
      info.el.style.visibility = 'hidden';
      info.el.style.opacity = '0';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Turnos
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        La creación de turnos ahora se realiza desde la sección de Pagos. Esta vista es solo para consultar y eliminar turnos existentes.
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<RefreshIcon />}
          onClick={recargarTurnos}
          sx={{ mr: 2 }}
        >
          Actualizar Turnos
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ 
        height: 'calc(100vh - 180px)',
        '.fc-event-title': { 
          whiteSpace: 'normal',
          overflow: 'hidden'
        },
        '.evento-fantasma': {
          display: 'none !important'
        }
      }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="timeGridWeek"
          editable={false}
          selectable={false}
          selectMirror={false}
          dayMaxEvents={true}
          weekends={false}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          locale={esLocale}
          events={eventosCalendario}
          eventClassNames={'turno-evento'}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventDidMount={handleEventoMontado}
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