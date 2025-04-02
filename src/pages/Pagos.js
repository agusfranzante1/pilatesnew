import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../config/supabaseClient';
import { es } from 'date-fns/locale';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';
import { addMonths, format, addDays, addWeeks, parseISO, isSameDay } from 'date-fns';

function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedPago, setSelectedPago] = useState(null);
  const [nuevoPago, setNuevoPago] = useState({
    alumno_id: '',
    fecha_inicio: new Date(),
    fecha_fin: addMonths(new Date(), 1),
    monto: '',
    frecuencia: 1,
    plan_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para el manejo de turnos
  const [generarTurnos, setGenerarTurnos] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [turnosSeleccionados, setTurnosSeleccionados] = useState([]);
  const [turnosCreados, setTurnosCreados] = useState([]);

  // Constantes para los turnos
  const steps = ['Información del Pago', 'Selección de Turnos', 'Resumen'];
  
  // Horarios predeterminados (8:00 a 21:00)
  const HORARIOS = Array.from({ length: 14 }, (_, i) => {
    const hora = i + 8;
    return `${hora.toString().padStart(2, '0')}:00`;
  });
  
  // Días de la semana para seleccionar
  const DIAS_SEMANA = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' }
  ];

  // Añadir un nuevo estado para controlar si está en proceso de guardado
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cargarPagos();
    cargarAlumnos();
    cargarPlanes();
  }, []);

  const cargarPagos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          alumnos (
            nombre
          ),
          planes (
            nombre
          )
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      // Convertir fechas de string a objetos Date
      const pagosConFechas = data.map(pago => ({
        ...pago,
        fecha_inicio: new Date(pago.fecha_inicio),
        fecha_fin: new Date(pago.fecha_fin)
      }));

      setPagos(pagosConFechas || []);
    } catch (error) {
      console.error('Error al cargar pagos:', error.message);
      setError('Error al cargar los pagos: ' + error.message);
    }
  };

  const cargarAlumnos = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('No hay datos de alumnos');
        setAlumnos([]);
        return;
      }

      console.log('Alumnos cargados:', data);
      setAlumnos(data);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      setError('Error al cargar los alumnos: ' + error.message);
    }
  };

  const cargarPlanes = async () => {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setPlanes(data || []);
    } catch (error) {
      console.error('Error al cargar planes:', error.message);
      setError('Error al cargar los planes: ' + error.message);
    }
  };

  const handleOpenEdit = (pago) => {
    setSelectedPago({
      ...pago,
      monto: pago.monto.toString(),
      fecha_inicio: new Date(pago.fecha_inicio),
      fecha_fin: new Date(pago.fecha_fin),
      plan_id: pago.plan_id || ''
    });
    setOpenEditDialog(true);
  };

  const handlePlanChange = (e) => {
    const planId = e.target.value;
    const planSeleccionado = planes.find(p => p.id === planId);
    
    if (planSeleccionado) {
      const fechaFin = new Date(nuevoPago.fecha_inicio);
      fechaFin.setDate(fechaFin.getDate() + 30); // Duración fija de 30 días
      
      setNuevoPago({
        ...nuevoPago,
        plan_id: planId,
        monto: planSeleccionado.precio,
        frecuencia: planSeleccionado.frecuencia,
        fecha_fin: fechaFin
      });
    } else {
      setNuevoPago({
        ...nuevoPago,
        plan_id: '',
        monto: '',
        frecuencia: 1
      });
    }
  };

  const handleFechaInicioChange = async (fecha) => {
    // Calcular la nueva fecha de finalización (un mes después de la fecha de inicio)
    const nuevaFechaFin = addMonths(fecha, 1);
    
    setNuevoPago(prev => ({
      ...prev,
      fecha_inicio: fecha,
      fecha_fin: nuevaFechaFin
    }));
    
    // Si hay un alumno seleccionado, verificar si tiene pagos activos
    if (nuevoPago.alumno_id) {
      try {
        const fechaInicio = format(fecha, 'yyyy-MM-dd');
        const resultado = await verificarPagoActivo(nuevoPago.alumno_id, fechaInicio);
        
        if (resultado.tieneActivo) {
          setError(resultado.mensaje);
        } else {
          setError('');
        }
      } catch (error) {
        console.error('Error al verificar pagos activos:', error);
      }
    }
  };

  const handlePlanEditChange = (e) => {
    const planId = e.target.value;
    const planSeleccionado = planes.find(p => p.id === planId);
    
    if (planSeleccionado) {
      const fechaFin = new Date(selectedPago.fecha_inicio);
      fechaFin.setDate(fechaFin.getDate() + 30); // Duración fija de 30 días
      
      setSelectedPago({
        ...selectedPago,
        plan_id: planId,
        monto: planSeleccionado.precio.toString(),
        frecuencia: planSeleccionado.frecuencia,
        fecha_fin: fechaFin
      });
    } else {
      setSelectedPago({
        ...selectedPago,
        plan_id: '',
        // No cambiamos el monto ni la frecuencia por si fueron personalizados
      });
    }
  };

  // Función para manejar la selección de día y hora para un turno
  const handleTurnoSeleccionado = (dia, hora, index) => {
    const nuevosTurnos = [...turnosSeleccionados];
    
    console.log(`Seleccionando día ${dia} y hora ${hora} para el turno ${index}`);

    if (nuevosTurnos[index]) {
      if (dia) nuevosTurnos[index].dia = dia;
      if (hora) nuevosTurnos[index].hora = hora;
    } else {
      nuevosTurnos[index] = { dia, hora };
    }
    
    setTurnosSeleccionados(nuevosTurnos);
  };

  // Validar los días de la semana en turnos seleccionados antes de generar turnos
  const validarDiasSemana = () => {
    console.log('Validando días de la semana en turnos seleccionados');
    const turnosValidados = turnosSeleccionados.map(turno => {
      // Si no hay día o hora, retornar el turno sin cambios
      if (!turno || !turno.dia) return turno;
      
      // Asegurarse de que el día sea un número
      const diaNum = parseInt(turno.dia, 10);
      
      // Validar que el día está en el rango de 1 a 5 (lunes a viernes)
      if (isNaN(diaNum) || diaNum < 1 || diaNum > 5) {
        console.error(`Día inválido: ${turno.dia}. Resetear a vacío.`);
        return { ...turno, dia: '' };
      }
      
      console.log(`Día validado: ${diaNum}`);
      return { ...turno, dia: diaNum };
    });
    
    if (JSON.stringify(turnosValidados) !== JSON.stringify(turnosSeleccionados)) {
      console.log('Se han corregido días de la semana incorrectos');
      setTurnosSeleccionados(turnosValidados);
    }
    
    return turnosValidados;
  };

  // Función para verificar la disponibilidad de un horario
  const verificarDisponibilidad = async (fecha, hora) => {
    try {
      console.log(`Verificando disponibilidad para: ${fecha} ${hora}`);
      
      // Contar los turnos existentes para esa fecha y hora
      const { data, error, count } = await supabase
        .from('turnos')
        .select('id', { count: 'exact' })
        .eq('fecha', fecha)
        .eq('hora', hora);
      
      if (error) {
        console.error('Error al verificar disponibilidad:', error);
        throw error;
      }
      
      console.log(`Turnos encontrados para ${fecha} ${hora}: ${count}/5`);
      
      // Si hay 5 o más turnos, no hay disponibilidad
      return count < 5;
    } catch (error) {
      console.error('Error en verificarDisponibilidad:', error);
      return false;
    }
  };

  // Función para crear turnos recurrentes
  const crearTurnosRecurrentes = async (pagoId) => {
    try {
      if (!generarTurnos || turnosSeleccionados.length === 0) {
        console.log('No se generarán turnos porque generarTurnos está desactivado o no hay turnos seleccionados');
        return [];
      }
      
      // Validar los días de la semana antes de procesar
      validarDiasSemana();
      
      console.log('Fecha inicio:', nuevoPago.fecha_inicio);
      console.log('Turnos seleccionados después de validar:', turnosSeleccionados);
      console.log('Alumno ID:', nuevoPago.alumno_id);
      console.log('Pago ID:', pagoId);
      
      const fechaInicio = new Date(nuevoPago.fecha_inicio);
      // Calcular la fecha fin: un mes más 7 días desde la fecha de inicio
      const fechaFinMes = new Date(fechaInicio);
      fechaFinMes.setMonth(fechaFinMes.getMonth() + 1);
      const fechaFin = addDays(fechaFinMes, 7); // 37 días en total
      
      console.log('Fecha de inicio para turnos:', format(fechaInicio, 'yyyy-MM-dd'));
      console.log('Fecha fin para turnos:', format(fechaFin, 'yyyy-MM-dd'));
      
      const turnosParaGuardar = [];
      const turnosNoDisponibles = [];

      // Crear turnos para cada semana
      let fechaActual = new Date(fechaInicio);
      
      while (fechaActual <= fechaFin) {
        console.log('Procesando semana, fecha actual:', format(fechaActual, 'yyyy-MM-dd'));
        
        for (const turno of turnosSeleccionados) {
          if (!turno.dia || !turno.hora) continue;
          
          // Asegurarse de que el día sea un número
          const diaDeseado = parseInt(turno.dia, 10);
          
          if (isNaN(diaDeseado) || diaDeseado < 1 || diaDeseado > 5) {
            console.error(`Día inválido: ${turno.dia}. Saltando este turno.`);
            continue;
          }
          
          let fechaTurno = new Date(fechaActual);
          const diaActualSemana = fechaTurno.getDay(); // 0 = domingo, 1 = lunes, ...
          
          console.log(`Procesando turno - Día deseado: ${diaDeseado}, Día actual de la semana: ${diaActualSemana}`);
          
          // Calcular la diferencia de días para llegar al día deseado
          let diferenciaDias;
          
          // Si es domingo (0), solo sumar el día deseado
          if (diaActualSemana === 0) {
            diferenciaDias = diaDeseado;
          } else {
            // Para otros días, calcular la diferencia
            diferenciaDias = diaDeseado - diaActualSemana;
            
            // Si la diferencia es negativa, sumar 7 para ir a la próxima semana
            if (diferenciaDias < 0) {
              diferenciaDias += 7;
            }
          }
          
          // Caso especial: Si estamos en el primer ciclo y el día actual es el mismo que el día deseado
          if (isSameDay(fechaActual, fechaInicio) && diaActualSemana === diaDeseado) {
            diferenciaDias = 0;
          }
          
          console.log(`Diferencia de días calculada: ${diferenciaDias}`);
          
          // Sumar los días para llegar al día deseado
          fechaTurno.setDate(fechaTurno.getDate() + diferenciaDias);
          
          console.log(`Fecha calculada para el turno: ${format(fechaTurno, 'yyyy-MM-dd')}`);
          console.log(`Día de la semana de la fecha calculada: ${fechaTurno.getDay()}`);
          
          // Verificar que el día de la semana resultante coincida con el deseado
          const diaResultante = fechaTurno.getDay();
          // getDay(): 0 = domingo, 1 = lunes, ..., 6 = sábado
          // diaDeseado: 1 = lunes, 2 = martes, ..., 5 = viernes
          // Por lo tanto, si diaDeseado es 4 (jueves), esperamos que getDay() sea 4
          const diaEsperado = diaDeseado === 7 ? 0 : diaDeseado === 1 ? 1 : diaDeseado === 2 ? 2 : diaDeseado === 3 ? 3 : diaDeseado === 4 ? 4 : diaDeseado === 5 ? 5 : 6;
          
          if (diaResultante !== diaEsperado) {
            console.error(`Error en el cálculo de días: Se esperaba día ${diaEsperado} pero se obtuvo ${diaResultante}`);
            // Corregir la fecha manualmente
            let ajuste = 0;
            if (diaEsperado > diaResultante) {
              ajuste = diaEsperado - diaResultante;
            } else {
              ajuste = 7 - (diaResultante - diaEsperado);
            }
            fechaTurno.setDate(fechaTurno.getDate() + ajuste);
            console.log(`Fecha corregida: ${format(fechaTurno, 'yyyy-MM-dd')}, día de la semana: ${fechaTurno.getDay()}`);
          }
          
          if (fechaTurno >= fechaInicio && fechaTurno <= fechaFin) {
            const fechaFormateada = format(fechaTurno, 'yyyy-MM-dd');
            
            console.log(`Generando turno para ${fechaFormateada} a las ${turno.hora}`);
            
            // Verificar disponibilidad
            const disponible = await verificarDisponibilidad(fechaFormateada, turno.hora);
            
            if (!disponible) {
              console.log(`No hay disponibilidad para ${fechaFormateada} a las ${turno.hora}`);
              turnosNoDisponibles.push({
                fecha: fechaFormateada,
                hora: turno.hora
              });
              continue;
            }

            const nuevoTurno = {
              alumno_id: nuevoPago.alumno_id,
              fecha: fechaFormateada,
              hora: turno.hora,
              pago_id: pagoId // Asociar el turno con el pago
            };
            turnosParaGuardar.push(nuevoTurno);
            console.log(`Turno agregado para guardar: ${fechaFormateada} ${turno.hora}`);
          }
        }
        
        fechaActual = addWeeks(fechaActual, 1);
      }

      console.log(`Total de turnos a guardar: ${turnosParaGuardar.length}`);
      console.log('Turnos para guardar:', turnosParaGuardar);

      // Mostrar mensaje si hay turnos no disponibles
      if (turnosNoDisponibles.length > 0) {
        const mensaje = turnosNoDisponibles.map(t => 
          `${format(parseISO(t.fecha), 'dd/MM/yyyy', { locale: es })} a las ${t.hora}`
        ).join(', ');
        setError(`No hay disponibilidad para los siguientes horarios: ${mensaje}`);
      }

      // Insertar los turnos disponibles
      const turnosInsertados = [];
      
      // Usar inserción por lotes para mayor eficiencia
      if (turnosParaGuardar.length > 0) {
        try {
          const { data, error } = await supabase
            .from('turnos')
            .insert(turnosParaGuardar)
            .select();
          
          if (error) {
            console.error('Error detallado al insertar turnos en lote:', error);
            console.error('Código:', error.code);
            console.error('Mensaje:', error.message);
            console.error('Detalles:', error.details);
            console.error('Pista:', error.hint);
            throw error;
          }
          
          if (data && data.length > 0) {
            console.log(`Insertados ${data.length} turnos en un solo lote`);
            console.log('Turnos insertados:', data);
            turnosInsertados.push(...data);
          }
        } catch (error) {
          console.error('Error al insertar turnos en lote:', error);
          
          // Si falla la inserción por lotes, intentar insertar uno por uno
          console.log('Intentando insertar turnos uno por uno...');
          
          for (const turnoParaGuardar of turnosParaGuardar) {
            // Verificar nuevamente la disponibilidad antes de insertar
            const disponible = await verificarDisponibilidad(turnoParaGuardar.fecha, turnoParaGuardar.hora);
            
            if (!disponible) {
              console.log(`El turno ${turnoParaGuardar.fecha} a las ${turnoParaGuardar.hora} ya no está disponible`);
              continue;
            }

            // Insertar el turno
            try {
              const { data, error } = await supabase
                .from('turnos')
                .insert([turnoParaGuardar])
                .select();

              if (error) {
                console.error('Error al insertar turno individual:', error);
              } else if (data && data.length > 0) {
                console.log('Turno insertado correctamente:', data[0]);
                turnosInsertados.push(...data);
              }
            } catch (innerError) {
              console.error('Error inesperado al insertar turno individual:', innerError);
            }
          }
        }
      }

      console.log(`Total de turnos insertados: ${turnosInsertados.length}`);
      console.log('IDs de turnos insertados:', turnosInsertados.map(t => t.id));

      // Si se insertaron turnos correctamente
      if (turnosInsertados.length > 0) {
        // Invocar explícitamente la recarga de turnos en otras páginas (usando un evento personalizado)
        const event = new CustomEvent('turnosActualizados', { detail: turnosInsertados });
        window.dispatchEvent(event);
        
        setTurnosCreados(turnosInsertados);
        setSuccess(`Se han registrado ${turnosInsertados.length} turnos correctamente.`);
        
        // Notificar a las otras páginas después de un breve retraso
        setTimeout(() => {
          // Intentar recargar los turnos directamente en otras páginas que podrían estar abiertas
          try {
            if (window.opener && window.opener.cargarTurnos) {
              window.opener.cargarTurnos();
            }
          } catch (e) {
            console.log('No se pudo recargar en la ventana principal:', e);
          }
          
          // Si todo lo demás falla, redirigir a la página de turnos
          // window.location.href = '/turnos';
        }, 1500);
      } else {
        const errorMsg = 'No se pudo insertar ningún turno. Por favor, inténtelo de nuevo.';
        console.error(errorMsg);
        console.error('Turnos para guardar:', turnosParaGuardar);
        console.error('¿Se ha aplicado la migración? El campo pago_id debe existir en la tabla turnos.');
        setError(errorMsg);
      }
      
      return turnosInsertados;
    } catch (error) {
      console.error('Error al crear turnos:', error.message);
      setError('Error al crear los turnos: ' + error.message);
      return [];
    }
  };

  // Función para limpiar estados de turnos
  const limpiarTurnos = () => {
    setTurnosSeleccionados([]);
    setTurnosCreados([]);
    setActiveStep(0);
  };

  // Función para avanzar al siguiente paso
  const handleNext = () => {
    if (activeStep === 0) {
      // Si aún no se ha seleccionado un plan, mostrar error
      if (!nuevoPago.plan_id) {
        setError('Debe seleccionar un plan para continuar');
        return;
      }
      
      // Inicializar los slots de turnos según la frecuencia del plan
      const frecuencia = parseInt(nuevoPago.frecuencia);
      const nuevosTurnos = Array(frecuencia).fill({ dia: '', hora: '' });
      setTurnosSeleccionados(nuevosTurnos);
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };

  // Función para retroceder al paso anterior
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Función para verificar si un alumno tiene un pago activo
  const verificarPagoActivo = async (alumnoId, fechaInicio) => {
    try {
      const fechaActual = new Date().toISOString().split('T')[0];
      
      // Obtener todos los pagos activos del alumno (donde la fecha actual está entre fecha_inicio y fecha_fin)
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', alumnoId)
        .lte('fecha_inicio', fechaActual) // fecha_inicio <= fecha actual
        .gte('fecha_fin', fechaActual)    // fecha_fin >= fecha actual
        .order('fecha_fin', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // El alumno tiene al menos un pago activo
        const pagoActivo = data[0]; // Tomamos el pago que termina más tarde
        const fechaFinPagoActivo = new Date(pagoActivo.fecha_fin);
        const fechaInicioPropuesta = new Date(fechaInicio);
        
        console.log('Pago activo encontrado:', pagoActivo);
        console.log('Fecha fin del pago activo:', fechaFinPagoActivo);
        console.log('Fecha inicio propuesta:', fechaInicioPropuesta);
        
        // La fecha de inicio propuesta debe ser mayor o igual a la fecha de fin del pago activo
        if (fechaInicioPropuesta < fechaFinPagoActivo) {
          return {
            tieneActivo: true,
            pagoActivo: pagoActivo,
            mensaje: `El alumno ya tiene un pago activo hasta ${format(fechaFinPagoActivo, 'dd/MM/yyyy', { locale: es })}. La fecha de inicio del nuevo pago debe ser igual o posterior.`
          };
        }
      }
      
      return { tieneActivo: false };
    } catch (error) {
      console.error('Error al verificar pago activo:', error);
      throw error;
    }
  };

  // Función para manejar la selección del alumno
  const handleAlumnoChange = async (e) => {
    const alumnoId = e.target.value;
    setNuevoPago({
      ...nuevoPago,
      alumno_id: alumnoId
    });
    
    // Verificar si el alumno tiene pagos activos
    if (alumnoId) {
      try {
        const fechaInicio = format(nuevoPago.fecha_inicio, 'yyyy-MM-dd');
        const resultado = await verificarPagoActivo(alumnoId, fechaInicio);
        
        if (resultado.tieneActivo) {
          // Sugerir automáticamente la fecha después del último pago activo
          const nuevaFechaInicio = new Date(resultado.pagoActivo.fecha_fin);
          nuevaFechaInicio.setDate(nuevaFechaInicio.getDate() + 1); // Un día después
          
          const nuevaFechaFin = addMonths(nuevaFechaInicio, 1); // Un mes después de la nueva fecha inicio
          
          setNuevoPago(prev => ({
            ...prev,
            alumno_id: alumnoId,
            fecha_inicio: nuevaFechaInicio,
            fecha_fin: nuevaFechaFin
          }));
          
          // Mostrar mensaje informativo
          setError(`El alumno seleccionado tiene un pago activo hasta ${format(new Date(resultado.pagoActivo.fecha_fin), 'dd/MM/yyyy', { locale: es })}. La fecha de inicio se ha ajustado automáticamente.`);
        } else {
          setError('');
        }
      } catch (error) {
        console.error('Error al verificar pagos activos:', error);
      }
    }
  };

  // Función para manejar la selección del alumno en la edición
  const handleEditAlumnoChange = async (e) => {
    const alumnoId = e.target.value;
    setSelectedPago({
      ...selectedPago,
      alumno_id: alumnoId
    });
    
    // Verificar si el alumno tiene pagos activos
    if (alumnoId) {
      try {
        const fechaInicio = format(selectedPago.fecha_inicio, 'yyyy-MM-dd');
        const resultado = await verificarPagoActivo(alumnoId, fechaInicio);
        
        if (resultado.tieneActivo) {
          // Sugerir automáticamente la fecha después del último pago activo
          const nuevaFechaInicio = new Date(resultado.pagoActivo.fecha_fin);
          nuevaFechaInicio.setDate(nuevaFechaInicio.getDate() + 1); // Un día después
          
          const nuevaFechaFin = addMonths(nuevaFechaInicio, 1); // Un mes después de la nueva fecha inicio
          
          setSelectedPago(prev => ({
            ...prev,
            alumno_id: alumnoId,
            fecha_inicio: nuevaFechaInicio,
            fecha_fin: nuevaFechaFin
          }));
          
          // Mostrar mensaje informativo
          setError(`El alumno seleccionado tiene un pago activo hasta ${format(new Date(resultado.pagoActivo.fecha_fin), 'dd/MM/yyyy', { locale: es })}. La fecha de inicio se ha ajustado automáticamente.`);
        } else {
          setError('');
        }
      } catch (error) {
        console.error('Error al verificar pagos activos:', error);
      }
    }
  };

  // Función para manejar la selección de fecha de inicio en la edición
  const handleEditFechaInicioChange = async (fecha) => {
    // Calcular la nueva fecha de finalización (un mes después de la fecha de inicio)
    const nuevaFechaFin = addMonths(fecha, 1);
    
    setSelectedPago(prev => ({
      ...prev,
      fecha_inicio: fecha,
      fecha_fin: nuevaFechaFin
    }));
    
    // Verificar si el alumno ya tiene un pago activo (excluyendo el pago actual que estamos editando)
    if (selectedPago && selectedPago.alumno_id) {
      try {
        const fechaInicio = format(fecha, 'yyyy-MM-dd');
        
        // Obtener pagos activos del alumno excepto el pago actual
        const fechaActual = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('pagos')
          .select('*')
          .eq('alumno_id', selectedPago.alumno_id)
          .neq('id', selectedPago.id) // Excluir el pago actual
          .lte('fecha_inicio', fechaActual)
          .gte('fecha_fin', fechaActual)
          .order('fecha_fin', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const pagoActivo = data[0];
          const fechaFinPagoActivo = new Date(pagoActivo.fecha_fin);
          const fechaInicioPropuesta = new Date(fechaInicio);
          
          if (fechaInicioPropuesta < fechaFinPagoActivo) {
            setError(`El alumno ya tiene otro pago activo hasta ${format(fechaFinPagoActivo, 'dd/MM/yyyy', { locale: es })}. La fecha de inicio debe ser igual o posterior.`);
            return;
          }
        }
      } catch (error) {
        console.error('Error al verificar pago activo:', error);
        setError('Error al verificar pagos activos: ' + error.message);
        return;
      }
    }
  };

  // Modificar handleSubmit para incluir la creación de turnos
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si ya está en proceso de envío, ignorar clics adicionales
    if (isSubmitting) {
      return;
    }
    
    setError('');
    setSuccess('');
    setIsSubmitting(true); // Iniciar proceso de envío

    if (!nuevoPago.alumno_id || !nuevoPago.fecha_inicio || !nuevoPago.monto) {
      setError('Por favor, complete todos los campos requeridos');
      setIsSubmitting(false);
      return;
    }

    // Verificar si el alumno ya tiene un pago activo
    try {
      const fechaInicio = format(nuevoPago.fecha_inicio, 'yyyy-MM-dd');
      const resultado = await verificarPagoActivo(nuevoPago.alumno_id, fechaInicio);
      
      if (resultado.tieneActivo) {
        setError(resultado.mensaje);
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error('Error al verificar pago activo:', error);
      setError('Error al verificar pagos activos: ' + error.message);
      setIsSubmitting(false);
      return;
    }

    // Si estamos generando turnos y estamos en el último paso, verificar que todos los turnos tengan día y hora
    if (generarTurnos && activeStep === 2) {
      // Validar días de la semana
      validarDiasSemana();
      
      const turnosIncompletos = turnosSeleccionados.some(turno => !turno.dia || !turno.hora);
      if (turnosIncompletos) {
        setError('Por favor complete todos los días y horarios para los turnos');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Guardar el pago
      const { data, error } = await supabase
        .from('pagos')
        .insert([{
          alumno_id: nuevoPago.alumno_id,
          fecha_inicio: format(nuevoPago.fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(nuevoPago.fecha_fin, 'yyyy-MM-dd'),
          monto: Number(nuevoPago.monto),
          frecuencia: Number(nuevoPago.frecuencia),
          plan_id: nuevoPago.plan_id || null
        }])
        .select();

      if (error) throw error;
      
      // Si se ha solicitado generar turnos, crearlos
      let mensajeTurnos = '';
      
      if (generarTurnos && data && data.length > 0) {
        const pagoId = data[0].id;
        const turnosCreados = await crearTurnosRecurrentes(pagoId);
        
        if (turnosCreados.length > 0) {
          mensajeTurnos = ` y se crearon ${turnosCreados.length} turnos`;
        }
      }
      
      setSuccess(`Pago registrado correctamente${mensajeTurnos}. Los turnos asociados se eliminarán automáticamente si se elimina este pago.`);
      setOpenDialog(false);
      cargarPagos();
      limpiarTurnos();
    } catch (error) {
      console.error('Error al registrar pago:', error.message);
      setError('Error al registrar el pago: ' + error.message);
    } finally {
      setIsSubmitting(false); // Finalizar proceso de envío independientemente del resultado
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Si ya está en proceso de envío, ignorar clics adicionales
    if (isSubmitting) {
      return;
    }
    
    setError('');
    setSuccess('');
    setIsSubmitting(true); // Iniciar proceso de envío
    
    if (!selectedPago) {
      setError('No hay pago seleccionado para editar');
      setIsSubmitting(false);
      return;
    }

    // Verificar si el alumno ya tiene un pago activo (excluyendo el pago actual que estamos editando)
    try {
      const fechaInicio = format(selectedPago.fecha_inicio, 'yyyy-MM-dd');
      
      // Obtener pagos activos del alumno excepto el pago actual
      const fechaActual = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', selectedPago.alumno_id)
        .neq('id', selectedPago.id) // Excluir el pago actual
        .lte('fecha_inicio', fechaActual)
        .gte('fecha_fin', fechaActual)
        .order('fecha_fin', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const pagoActivo = data[0];
        const fechaFinPagoActivo = new Date(pagoActivo.fecha_fin);
        const fechaInicioPropuesta = new Date(fechaInicio);
        
        if (fechaInicioPropuesta < fechaFinPagoActivo) {
          setError(`El alumno ya tiene otro pago activo hasta ${format(fechaFinPagoActivo, 'dd/MM/yyyy', { locale: es })}. La fecha de inicio debe ser igual o posterior.`);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error al verificar pago activo:', error);
      setError('Error al verificar pagos activos: ' + error.message);
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('pagos')
        .update({
          alumno_id: selectedPago.alumno_id,
          fecha_inicio: format(selectedPago.fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(selectedPago.fecha_fin, 'yyyy-MM-dd'),
          monto: Number(selectedPago.monto),
          frecuencia: Number(selectedPago.frecuencia),
          plan_id: selectedPago.plan_id || null
        })
        .eq('id', selectedPago.id);

      if (error) throw error;
      
      setSuccess('Pago actualizado correctamente');
      setOpenEditDialog(false);
      cargarPagos();
    } catch (error) {
      console.error('Error al actualizar pago:', error.message);
      setError('Error al actualizar el pago: ' + error.message);
    } finally {
      setIsSubmitting(false); // Finalizar proceso de envío independientemente del resultado
    }
  };

  const handleDelete = async (id) => {
    try {
      // Primero, intentamos eliminar los turnos asociados al pago
      // Verificamos si el campo pago_id existe en la tabla turnos
      const { data: turnos, error: turnosError } = await supabase
        .from('turnos')
        .select('*')
        .eq('pago_id', id);
      
      if (!turnosError && turnos && turnos.length > 0) {
        // Si existen turnos asociados al pago, los eliminamos
        const { error: deleteError } = await supabase
          .from('turnos')
          .delete()
          .eq('pago_id', id);
          
        if (deleteError) {
          console.error('Error al eliminar los turnos asociados:', deleteError);
          // Continuar con la eliminación del pago incluso si falla la eliminación de turnos
        } else {
          console.log(`Se eliminaron ${turnos.length} turnos asociados al pago.`);
        }
      } else {
        // Si no hay turnos con pago_id, intentamos eliminación por fecha y alumno_id
        // Obtenemos el pago para conseguir el alumno_id y las fechas
        const { data: pago, error: pagoError } = await supabase
          .from('pagos')
          .select('alumno_id, fecha_inicio, fecha_fin')
          .eq('id', id)
          .single();
        
        if (!pagoError && pago) {
          // Buscar turnos en el rango de fechas para este alumno
          const { data: turnosFecha, error: turnosFechaError } = await supabase
            .from('turnos')
            .select('*')
            .eq('alumno_id', pago.alumno_id)
            .gte('fecha', pago.fecha_inicio)
            .lte('fecha', pago.fecha_fin);
          
          if (!turnosFechaError && turnosFecha && turnosFecha.length > 0) {
            // Eliminar estos turnos
            const { error: deleteFechaError } = await supabase
              .from('turnos')
              .delete()
              .eq('alumno_id', pago.alumno_id)
              .gte('fecha', pago.fecha_inicio)
              .lte('fecha', pago.fecha_fin);
              
            if (deleteFechaError) {
              console.error('Error al eliminar los turnos por fecha:', deleteFechaError);
            } else {
              console.log(`Se eliminaron ${turnosFecha.length} turnos por rango de fechas.`);
            }
          }
        }
      }

      // Ahora eliminamos el pago
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      setSuccess('Pago y sus turnos asociados eliminados exitosamente');
      await cargarPagos();
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      setError('Error al eliminar el pago: ' + error.message);
    }
  };

  const handleClose = () => {
    setOpenDialog(false);
    setNuevoPago({
      alumno_id: '',
      fecha_inicio: new Date(),
      fecha_fin: addMonths(new Date(), 1),
      monto: '',
      frecuencia: 1,
      plan_id: ''
    });
    setTurnosSeleccionados([]);
    setActiveStep(0);
    setError('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gestión de Pagos</Typography>
        <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
          Nuevo Pago
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alumno</TableCell>
              <TableCell>Fecha Inicio</TableCell>
              <TableCell>Fecha Fin</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Frecuencia</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.map((pago) => (
              <TableRow key={pago.id}>
                <TableCell>{pago.alumnos?.nombre}</TableCell>
                <TableCell>{new Date(pago.fecha_inicio).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(pago.fecha_fin).toLocaleDateString()}</TableCell>
                <TableCell>${pago.monto}</TableCell>
                <TableCell>{pago.frecuencia} veces por semana</TableCell>
                <TableCell>{pago.planes?.nombre || 'Sin plan asignado'}</TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenEdit(pago)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDelete(pago.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para nuevo pago */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Pago</DialogTitle>
        <DialogContent>
          {generarTurnos && (
            <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {/* Paso 1: Información del Pago */}
          {(!generarTurnos || activeStep === 0) && (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Alumno</InputLabel>
                    <Select
                      value={nuevoPago.alumno_id}
                      onChange={handleAlumnoChange}
                      label="Alumno"
                      required
                    >
                      {alumnos.map((alumno) => (
                        <MenuItem key={alumno.id} value={alumno.id}>
                          {alumno.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha de inicio"
                      value={nuevoPago.fecha_inicio}
                      onChange={handleFechaInicioChange}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha de fin"
                      value={nuevoPago.fecha_fin}
                      disabled
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Plan</InputLabel>
                    <Select
                      value={nuevoPago.plan_id}
                      onChange={handlePlanChange}
                      label="Plan"
                      required
                    >
                      <MenuItem value="">Seleccione un plan</MenuItem>
                      {planes.map((plan) => (
                        <MenuItem key={plan.id} value={plan.id}>
                          {plan.nombre} - ${plan.precio} - {plan.frecuencia} veces/semana
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Monto"
                    type="number"
                    value={nuevoPago.monto}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, monto: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={generarTurnos}
                        onChange={(e) => setGenerarTurnos(e.target.checked)}
                      />
                    }
                    label="Generar turnos automáticamente"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Paso 2: Selección de Turnos */}
          {generarTurnos && activeStep === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Seleccionar Turnos
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Seleccione {nuevoPago.frecuencia} turnos semanales según el plan:
              </Typography>
              
              <Grid container spacing={3}>
                {Array.from({ length: parseInt(nuevoPago.frecuencia) }).map((_, index) => (
                  <Grid item xs={12} key={index}>
                    <Typography variant="subtitle2" gutterBottom>
                      Turno {index + 1}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Día de la semana</InputLabel>
                          <Select
                            value={turnosSeleccionados[index]?.dia || ''}
                            onChange={(e) => handleTurnoSeleccionado(e.target.value, turnosSeleccionados[index]?.hora || '', index)}
                            label="Día de la semana"
                          >
                            {DIAS_SEMANA.map((dia) => (
                              <MenuItem key={dia.value} value={dia.value}>
                                {dia.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Hora</InputLabel>
                          <Select
                            value={turnosSeleccionados[index]?.hora || ''}
                            onChange={(e) => handleTurnoSeleccionado(turnosSeleccionados[index]?.dia || '', e.target.value, index)}
                            label="Hora"
                          >
                            {HORARIOS.map((hora) => (
                              <MenuItem key={hora} value={hora}>
                                {hora}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    {index < parseInt(nuevoPago.frecuencia) - 1 && (
                      <Divider sx={{ my: 2 }} />
                    )}
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          
          {/* Paso 3: Resumen */}
          {generarTurnos && activeStep === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Resumen del Pago y Turnos
              </Typography>
              
              <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                Información del Pago:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Alumno:</strong> {alumnos.find(a => a.id === nuevoPago.alumno_id)?.nombre}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Plan:</strong> {planes.find(p => p.id === nuevoPago.plan_id)?.nombre}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Monto:</strong> ${nuevoPago.monto}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Frecuencia:</strong> {nuevoPago.frecuencia} veces/semana
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Fecha Inicio:</strong> {format(nuevoPago.fecha_inicio, 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography>
                    <strong>Fecha Fin:</strong> {format(nuevoPago.fecha_fin, 'dd/MM/yyyy')}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>
                Turnos a Generar:
              </Typography>
              <List>
                {turnosSeleccionados.map((turno, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`Turno ${index + 1}`} 
                      secondary={`${DIAS_SEMANA.find(d => d.value === turno.dia)?.label || ''} a las ${turno.hora || ''}`} 
                    />
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                * Se crearán turnos recurrentes para los próximos 37 días a partir del {format(nuevoPago.fecha_inicio, 'dd/MM/yyyy')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          
          {generarTurnos && activeStep > 0 && (
            <Button onClick={handleBack} disabled={isSubmitting}>
              Atrás
            </Button>
          )}
          
          {generarTurnos && activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} variant="contained" color="primary" disabled={isSubmitting}>
              Siguiente
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              color="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar pago */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Pago</DialogTitle>
        <DialogContent>
          {selectedPago && (
            <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Alumno</InputLabel>
                    <Select
                      value={selectedPago.alumno_id}
                      onChange={handleEditAlumnoChange}
                      label="Alumno"
                      required
                    >
                      {alumnos.map((alumno) => (
                        <MenuItem key={alumno.id} value={alumno.id}>
                          {alumno.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha de inicio"
                      value={selectedPago.fecha_inicio}
                      onChange={handleEditFechaInicioChange}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha de fin"
                      value={selectedPago.fecha_fin}
                      disabled
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Monto"
                    type="number"
                    value={selectedPago.monto}
                    onChange={(e) => setSelectedPago({ ...selectedPago, monto: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Frecuencia (veces por semana)</InputLabel>
                    <Select
                      value={selectedPago.frecuencia}
                      onChange={(e) => setSelectedPago({ ...selectedPago, frecuencia: e.target.value })}
                      label="Frecuencia (veces por semana)"
                      required
                    >
                      <MenuItem value={1}>1 vez por semana</MenuItem>
                      <MenuItem value={2}>2 veces por semana</MenuItem>
                      <MenuItem value={3}>3 veces por semana</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Plan</InputLabel>
                    <Select
                      value={selectedPago.plan_id}
                      onChange={handlePlanEditChange}
                      label="Plan"
                    >
                      <MenuItem value="">Seleccione un plan</MenuItem>
                      {planes.map((plan) => (
                        <MenuItem key={plan.id} value={plan.id}>
                          {plan.nombre} - ${plan.precio} - {plan.frecuencia} veces/semana
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Pagos; 