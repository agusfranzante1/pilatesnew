import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../config/supabaseClient';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';

function TurnosPublicos() {
  const navigate = useNavigate();
  const [turnos, setTurnos] = useState([]);
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const theme = useTheme();

  // Horarios predeterminados (8:00 a 21:00)
  const HORARIOS = Array.from({ length: 14 }, (_, i) => {
    const hora = i + 8;
    return `${hora.toString().padStart(2, '0')}:00`;
  });

  useEffect(() => {
    console.log('Componente TurnosPublicos montado');
    cargarTurnos();

    // Suscribirse a cambios en la tabla de turnos
    const channel = supabase.channel('custom-all-channel')
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
        console.log('Status de suscripción:', status);
      });

    // Limpiar suscripción al desmontar
    return () => {
      console.log('Limpiando suscripción');
      channel.unsubscribe();
    };
  }, []);

  const cargarTurnos = async () => {
    try {
      console.log('Iniciando carga de turnos...');
      const fechaHoy = new Date().toISOString().split('T')[0];
      console.log('Fecha de hoy:', fechaHoy);

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
        .gte('fecha', fechaHoy)
        .order('fecha', { ascending: true });

      if (error) {
        console.error('Error al cargar turnos:', error);
        throw error;
      }

      console.log('Turnos cargados:', data);

      // Convertir los datos al formato que espera FullCalendar
      const eventos = data.map(turno => ({
        id: turno.id,
        title: turno.alumnos?.nombre || 'Sin nombre',
        start: `${turno.fecha}T${turno.hora}`,
        end: `${turno.fecha}T${turno.hora}`,
        backgroundColor: '#1976d2',
        borderColor: '#1976d2',
        textColor: '#ffffff',
        extendedProps: {
          alumnoId: turno.alumno_id
        }
      }));

      setTurnos(data || []);
      setEventosCalendario(eventos);
      
      // Forzar actualización de contadores después de un breve retraso
      setTimeout(() => {
        console.log('Actualizando contadores de disponibilidad...');
        actualizarContadoresDisponibilidad();
      }, 500);
    } catch (error) {
      console.error('Error al cargar turnos:', error.message);
    }
  };

  // Función para actualizar manualmente los contadores de disponibilidad
  const actualizarContadoresDisponibilidad = () => {
    console.log('Iniciando actualización de contadores...');
    
    // Enfoque directo: crear los contadores para cada celda del calendario
    // 1. Primero obtenemos las fechas de la semana actual que se muestra
    const columnasDias = document.querySelectorAll('.fc-timegrid-col');
    const fechasDias = Array.from(columnasDias).map(col => {
      const header = col.closest('.fc-timegrid-body').querySelector(`.fc-col-header-cell[data-date]`);
      return header ? header.getAttribute('data-date') : null;
    }).filter(Boolean);
    
    console.log('Fechas encontradas en el calendario:', fechasDias);
    
    // 2. Para cada fecha y hora, crear un contador y agregarlo manualmente
    fechasDias.forEach(fecha => {
      HORARIOS.forEach(hora => {
        // Contar los turnos para esta fecha y hora específica
        const turnosEnEsteHorario = turnos.filter(t => 
          t.fecha === fecha && t.hora === hora
        ).length;
        
        console.log(`${fecha} ${hora}: ${turnosEnEsteHorario}/5 turnos`);
        
        // Buscar la celda correcta para esta fecha y hora
        const columnaIndex = fechasDias.indexOf(fecha);
        const columna = document.querySelectorAll('.fc-timegrid-col')[columnaIndex];
        if (!columna) {
          console.log(`No se encontró columna para fecha ${fecha}`);
          return;
        }
        
        // Hora formateada para buscar (convertir "09:00" a "0900")
        const horaFormateada = hora.replace(':', '');
        
        // Buscar la celda de esa hora específica
        const celdaHora = columna.querySelector(`.fc-timegrid-slot[data-time="${horaFormateada}"], [data-time="${hora}"]`);
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
  };

  const handleDatesSet = (arg) => {
    console.log('Fechas del calendario cambiadas:', arg.start, arg.end);
    // Dar tiempo a que el DOM se actualice
    setTimeout(actualizarContadoresDisponibilidad, 300);
  };

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      p: 3,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate('/login')}
        >
          Iniciar Sesión
        </Button>
        <Typography variant="h4" sx={{ 
          textAlign: 'center',
          color: theme.palette.primary.main
        }}>
          Disponibilidad de Turnos
        </Typography>
        <Box sx={{ width: '100px' }}></Box> {/* Espaciador para centrar el título */}
      </Box>

      <Box sx={{ 
        flexGrow: 1,
        width: '100%',
        height: 'calc(100vh - 100px)',
        '& .fc': { height: '100%' }
      }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          locale={esLocale}
          timeZone="local"
          events={eventosCalendario}
          eventContent={renderEventContent}
          timeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          slotEventOverlap={false}
          eventMaxStack={5}
          datesSet={handleDatesSet}
          selectable={false}
          editable={false}
        />
      </Box>
    </Box>
  );
}

// Función para renderizar el contenido de los eventos
const renderEventContent = (eventInfo) => {
  return (
    <Box sx={{ 
      p: 1, 
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.85em',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}>
      {eventInfo.event.title}
    </Box>
  );
};

export default TurnosPublicos; 