import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Typography,
  IconButton,
  Tooltip,
  Alert,
  FormControlLabel,
  Switch,
  FormGroup
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { supabase } from '../config/supabaseClient';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { es } from 'date-fns/locale';

function Alumnos() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [alumnosFiltrados, setAlumnosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    email: '',
    telefono: '',
    dni: '',
    fecha_nacimiento: null,
    requiere_factura: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    cargarAlumnos();
  }, []);

  // Efecto para filtrar alumnos cuando cambia la búsqueda o la lista de alumnos
  useEffect(() => {
    filtrarAlumnos();
  }, [busqueda, alumnos]);

  const filtrarAlumnos = () => {
    if (!busqueda.trim()) {
      // Si no hay término de búsqueda, mostrar todos los alumnos
      setAlumnosFiltrados(alumnos);
      return;
    }

    // Filtrar alumnos que contengan la cadena de búsqueda (ignorar mayúsculas/minúsculas)
    const terminoBusqueda = busqueda.toLowerCase();
    const resultados = alumnos.filter(alumno => 
      alumno.nombre.toLowerCase().includes(terminoBusqueda) || 
      (alumno.dni && alumno.dni.includes(terminoBusqueda))
    );
    
    setAlumnosFiltrados(resultados);
  };

  const handleBusquedaChange = (e) => {
    setBusqueda(e.target.value);
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNuevoAlumno({ 
      nombre: '', 
      email: '', 
      telefono: '', 
      dni: '', 
      fecha_nacimiento: null,
      requiere_factura: false 
    });
  };

  const handleOpenEdit = (alumno) => {
    setSelectedAlumno(alumno);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedAlumno(null);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setNuevoAlumno({
      ...nuevoAlumno,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFechaNacimientoChange = (fecha) => {
    setNuevoAlumno({
      ...nuevoAlumno,
      fecha_nacimiento: fecha,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, checked, type } = e.target;
    setSelectedAlumno({
      ...selectedAlumno,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEditFechaNacimientoChange = (fecha) => {
    setSelectedAlumno({
      ...selectedAlumno,
      fecha_nacimiento: fecha,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convertir la fecha al formato ISO para almacenar en la base de datos
      let fechaNacimientoFormatted = null;
      if (nuevoAlumno.fecha_nacimiento) {
        fechaNacimientoFormatted = nuevoAlumno.fecha_nacimiento.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('alumnos')
        .insert([{
          nombre: nuevoAlumno.nombre,
          email: nuevoAlumno.email,
          telefono: nuevoAlumno.telefono,
          dni: nuevoAlumno.dni,
          fecha_nacimiento: fechaNacimientoFormatted,
          requiere_factura: nuevoAlumno.requiere_factura,
        }]);

      if (error) throw error;

      setSuccess('Alumno creado exitosamente');
      handleClose();
      await cargarAlumnos();
    } catch (error) {
      console.error('Error al agregar alumno:', error.message);
      setError('Error al crear el alumno: ' + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convertir la fecha al formato ISO para almacenar en la base de datos
      let fechaNacimientoFormatted = null;
      if (selectedAlumno.fecha_nacimiento) {
        if (typeof selectedAlumno.fecha_nacimiento === 'string') {
          fechaNacimientoFormatted = selectedAlumno.fecha_nacimiento;
        } else {
          fechaNacimientoFormatted = selectedAlumno.fecha_nacimiento.toISOString().split('T')[0];
        }
      }

      const { error } = await supabase
        .from('alumnos')
        .update({
          nombre: selectedAlumno.nombre,
          email: selectedAlumno.email,
          telefono: selectedAlumno.telefono,
          dni: selectedAlumno.dni,
          fecha_nacimiento: fechaNacimientoFormatted,
          requiere_factura: selectedAlumno.requiere_factura,
        })
        .eq('id', selectedAlumno.id);

      if (error) throw error;

      setSuccess('Alumno actualizado exitosamente');
      handleCloseEdit();
      await cargarAlumnos();
    } catch (error) {
      console.error('Error al actualizar alumno:', error.message);
      setError('Error al actualizar el alumno: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('alumnos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Alumno eliminado exitosamente');
      await cargarAlumnos();
    } catch (error) {
      console.error('Error al eliminar alumno:', error.message);
      setError('Error al eliminar el alumno: ' + error.message);
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
      setAlumnosFiltrados(data || []);
    } catch (error) {
      console.error('Error al cargar alumnos:', error.message);
      setError('Error al cargar los alumnos: ' + error.message);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gestión de Alumnos</Typography>
        <Box>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate('/turnos-publicos')}
            startIcon={<CalendarMonthIcon />}
            sx={{ mr: 2 }}
          >
            Ver Disponibilidad
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleOpen}
          >
            Nuevo Alumno
          </Button>
        </Box>
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

      {/* Buscador de alumnos */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Buscar alumno por nombre o DNI"
          variant="outlined"
          value={busqueda}
          onChange={handleBusquedaChange}
          placeholder="Ingrese nombre o DNI para buscar..."
          InputProps={{
            sx: { borderRadius: 2 },
            startAdornment: (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </Box>
            ),
            endAdornment: busqueda && (
              <IconButton 
                size="small" 
                onClick={limpiarBusqueda}
                aria-label="limpiar búsqueda"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </IconButton>
            )
          }}
        />
        {/* Contador de resultados */}
        {busqueda && (
          <Typography variant="body2" sx={{ mt: 1, ml: 1, color: 'text.secondary' }}>
            {alumnosFiltrados.length} {alumnosFiltrados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </Typography>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>DNI</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Teléfono</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Fecha Nac.</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Factura</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alumnosFiltrados.length > 0 ? (
              alumnosFiltrados.map((alumno, index) => (
                <TableRow 
                  key={alumno.id}
                  sx={{ 
                    '&:nth-of-type(odd)': { backgroundColor: 'background.default' },
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <TableCell>{alumno.nombre}</TableCell>
                  <TableCell>{alumno.dni}</TableCell>
                  <TableCell>{alumno.email}</TableCell>
                  <TableCell>{alumno.telefono}</TableCell>
                  <TableCell>{alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{alumno.requiere_factura ? 'Sí' : 'No'}</TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton 
                        onClick={() => handleOpenEdit(alumno)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton 
                        onClick={() => handleDelete(alumno.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  {busqueda ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#ccc" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                      </svg>
                      <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                        No se encontraron alumnos con esa búsqueda
                      </Typography>
                      <Button variant="text" onClick={limpiarBusqueda} sx={{ mt: 1 }}>
                        Limpiar búsqueda
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                      No hay alumnos registrados
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para nuevo alumno */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Alumno</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              name="nombre"
              value={nuevoAlumno.nombre}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="DNI"
              name="dni"
              value={nuevoAlumno.dni}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={nuevoAlumno.email}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Teléfono"
              name="telefono"
              value={nuevoAlumno.telefono}
              onChange={handleChange}
              margin="normal"
              required
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha de Nacimiento"
                value={nuevoAlumno.fecha_nacimiento}
                onChange={handleFechaNacimientoChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal"
                  }
                }}
              />
            </LocalizationProvider>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={nuevoAlumno.requiere_factura}
                    onChange={handleChange}
                    name="requiere_factura"
                    color="primary"
                  />
                }
                label="Requiere Factura"
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar alumno */}
      <Dialog open={openEdit} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Alumno</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              name="nombre"
              value={selectedAlumno?.nombre || ''}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="DNI"
              name="dni"
              value={selectedAlumno?.dni || ''}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={selectedAlumno?.email || ''}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Teléfono"
              name="telefono"
              value={selectedAlumno?.telefono || ''}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha de Nacimiento"
                value={selectedAlumno?.fecha_nacimiento ? new Date(selectedAlumno.fecha_nacimiento) : null}
                onChange={handleEditFechaNacimientoChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal"
                  }
                }}
              />
            </LocalizationProvider>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedAlumno?.requiere_factura || false}
                    onChange={handleEditChange}
                    name="requiere_factura"
                    color="primary"
                  />
                }
                label="Requiere Factura"
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancelar</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Alumnos; 