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
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { supabase } from '../config/supabaseClient';

function Alumnos() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    email: '',
    telefono: '',
    dni: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    cargarAlumnos();
  }, []);

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
      setError('Error al cargar los alumnos: ' + error.message);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setNuevoAlumno({ nombre: '', email: '', telefono: '', dni: '' });
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
    setNuevoAlumno({
      ...nuevoAlumno,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditChange = (e) => {
    setSelectedAlumno({
      ...selectedAlumno,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('alumnos')
        .insert([{
          nombre: nuevoAlumno.nombre,
          email: nuevoAlumno.email,
          telefono: nuevoAlumno.telefono,
          dni: nuevoAlumno.dni,
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
      const { error } = await supabase
        .from('alumnos')
        .update({
          nombre: selectedAlumno.nombre,
          email: selectedAlumno.email,
          telefono: selectedAlumno.telefono,
          dni: selectedAlumno.dni,
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alumnos.map((alumno) => (
              <TableRow key={alumno.id}>
                <TableCell>{alumno.nombre}</TableCell>
                <TableCell>{alumno.dni}</TableCell>
                <TableCell>{alumno.email}</TableCell>
                <TableCell>{alumno.telefono}</TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenEdit(alumno)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDelete(alumno.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
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