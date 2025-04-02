import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton
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
import RefreshIcon from '@mui/icons-material/Refresh';

function TurnosPublicos() {
  const navigate = useNavigate();
  const [turnos, setTurnos] = useState([]);
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const theme = useTheme();

  // Horarios predeterminados (8:00 a 22:00)
  const HORARIOS = Array.from({ length: 15 }, (_, i) => {
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

    // Establecer un intervalo para actualizar los turnos automáticamente cada 30 segundos
    const intervalo = setInterval(() => {
      console.log('Actualizando turnos automáticamente...');
      cargarTurnos();
    }, 30000);

    // Agregar listener para el evento personalizado de actualización de turnos
    const handleTurnosActualizados = (event) => {
      console.log('Evento de turnos actualizados recibido en TurnosPublicos:', event.detail);
      cargarTurnos();
    };
    
    window.addEventListener('turnosActualizados', handleTurnosActualizados);

    // Limpiar suscripción al desmontar
    return () => {
      console.log('Limpiando suscripción y intervalo');
      channel.unsubscribe();
      clearInterval(intervalo);
      window.removeEventListener('turnosActualizados', handleTurnosActualizados);
    };
  }, []);

  const cargarTurnos = async () => {
    try {
      console.log('Cargando turnos públicos...');
      
      const fechaHoy = new Date().toISOString().split('T')[0];
      console.log('Fecha de hoy para filtro:', fechaHoy);

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

      if (error) throw error;
      
      console.log('Turnos públicos cargados:', data?.length || 0);
      
      // Verificar si hay turnos para Agustín Franzante (para depuración)
      const turnosFranzante = data?.filter(turno => 
        turno.alumnos?.nombre?.includes('Franzante') || 
        turno.alumnos?.nombre?.includes('FRANZANTE') || 
        turno.alumnos?.nombre?.includes('franzante')
      );
      
      if (turnosFranzante && turnosFranzante.length > 0) {
        console.log('Turnos públicos encontrados para Franzante:', turnosFranzante.length);
        console.log('Detalle de turnos públicos de Franzante:', turnosFranzante);
      } else {
        console.log('No se encontraron turnos públicos para Franzante');
      }
      
      // Agrupar los turnos por fecha y hora
      const turnosAgrupados = {};
      
      data.forEach(turno => {
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
      
      // Crear eventos para cada grupo
      const todosLosEventos = [];
      
      Object.values(turnosAgrupados).forEach(grupo => {
        const cantidadTurnos = grupo.turnos.length;
        
        // Depurar los grupos por fecha
        console.log(`Grupo público: ${grupo.fecha} ${grupo.hora} - ${cantidadTurnos} turnos`);
        
        // Primero, agregar un evento para cada turno real
        grupo.turnos.forEach((turno, i) => {
          todosLosEventos.push({
            id: turno.id.toString(),
            title: "Ocupado",
            start: `${turno.fecha}T${turno.hora}`,
            end: `${turno.fecha}T${turno.hora}`,
            backgroundColor: '#1976d2',
            borderColor: '#1976d2',
            textColor: '#ffffff',
            display: 'auto',
            extendedProps: {
              alumnoId: turno.alumno_id,
              grupoId: `${turno.fecha}-${turno.hora}`,
              esReal: true,
              cantidad: cantidadTurnos
            }
          });
        });
        
        // Si solo hay 1 turno, agregar un evento fantasma invisible para forzar el "+más"
        if (cantidadTurnos === 1) {
          todosLosEventos.push({
            id: `fantasma-${grupo.fecha}-${grupo.hora}`,
            title: "", // Título vacío para que no aparezca en el popover
            start: `${grupo.fecha}T${grupo.hora}`,
            end: `${grupo.fecha}T${grupo.hora}`,
            display: 'background', // Usar display background para que no aparezca en el popover
            backgroundColor: 'transparent', // Hacerlo transparente
            borderColor: 'transparent',
            textColor: 'transparent',
            extendedProps: {
              grupoId: `${grupo.fecha}-${grupo.hora}`,
              esFantasma: true,
              cantidad: cantidadTurnos
            },
            classNames: ['evento-fantasma'] // Agregar clase para poder ocultarlo con CSS
          });
        }
      });
      
      console.log('Total de eventos públicos generados para el calendario:', todosLosEventos.length);
      
      setEventosCalendario(todosLosEventos);
    } catch (error) {
      console.error("Error al cargar los turnos:", error);
    }
  };

  // Función para recargar manualmente
  const recargarTurnos = () => {
    console.log('Recargando turnos públicos manualmente...');
    cargarTurnos();
  };

  // Función para calcular contadores de disponibilidad
  const actualizarContadoresDisponibilidad = () => {
    console.log("Actualizando contadores de disponibilidad");
    // Asegurar que todas las celdas tengan 30px de altura
    setTimeout(() => {
      const slots = document.querySelectorAll('.fc-timegrid-slot, .fc-timegrid-slot-lane');
      slots.forEach(slot => {
        slot.style.height = '30px';
      });
    }, 100);
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
        <IconButton 
          color="primary" 
          onClick={recargarTurnos}
          sx={{ width: '100px' }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      <Box sx={{ 
        flexGrow: 1,
        width: '100%',
        height: 'calc(100vh - 100px)',
        '& .fc': { height: '100%' }
      }}>
        <style>
          {`
            /* Estilos para los eventos del calendario */
            .fc-timegrid-event-harness {
              margin: 0 !important;
            }
            
            /* Asegurar que los eventos se muestren correctamente */
            .fc-timegrid-event {
              width: 100% !important;
              margin: 0 !important;
              border-radius: 4px !important;
              padding: 2px 4px !important;
              font-size: 0.85em !important;
            }
            
            /* Ajustar el tamaño de las celdas para que sean más compactas */
            .fc-timegrid-slot {
              height: 30px !important;
            }
            
            .fc-timegrid-slot-lane {
              height: 30px !important;
            }
            
            /* Asegurar que los eventos apilados sean visibles */
            .fc-v-event {
              min-height: 22px !important;
              margin: 1px 0 !important;
            }
            
            /* Estilo para el indicador "Mostrar más eventos" */
            .fc-timegrid-more-link {
              background-color: rgba(25, 118, 210, 0.2) !important;
              color: #1976d2 !important;
              font-weight: bold !important;
              font-size: 12px !important;
              border-radius: 4px !important;
              margin: 1px 0 !important;
              padding: 2px !important;
              text-align: center !important;
              cursor: pointer !important;
              width: 100% !important;
              left: 0 !important;
              right: 0 !important;
              box-sizing: border-box !important;
            }
            
            /* Asegurar que el contenido del enlace "Mostrar más" ocupe todo el ancho */
            .fc-timegrid-more-link-inner {
              width: 100% !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            }
            
            /* Mejorar la visualización de los eventos en la columna de tiempo */
            .fc-timegrid-col-events {
              margin: 0 !important;
            }
            
            /* Ocultar eventos fantasma */
            .evento-fantasma {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
          `}
        </style>
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          locale={esLocale}
          timeZone="local"
          events={eventosCalendario}
          eventContent={renderEventContent}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          slotEventOverlap={false}
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          eventMaxStack={0}
          datesSet={handleDatesSet}
          selectable={false}
          editable={false}
          height="auto"
          moreLinkText={(n) => `${n} turno(s)`}
          dayMaxEvents={1}
          dayMaxEventRows={1}
          eventDisplay="auto"
          displayEventTime={false}
          nowIndicator={true}
          moreLinkClick="popover"
        />
      </Box>
    </Box>
  );
}

// Función para renderizar el contenido de los eventos
const renderEventContent = (eventInfo) => {
  // Obtener la cantidad de turnos del grupo desde las propiedades extendidas
  const cantidad = eventInfo.event.extendedProps?.cantidad || 1;
  
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
      Ocupado
    </div>
  );
};

export default TurnosPublicos; 