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
  Typography,
  IconButton,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../config/supabaseClient';

function Planes() {
  const [planes, setPlanes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [nuevoPlan, setNuevoPlan] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    frecuencia: 1
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    cargarPlanes();
  }, []);

  const cargarPlanes = async () => {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setPlanes(data || []);
    } catch (error) {
      console.error('Error al cargar planes:', error.message);
      setError('Error al cargar los planes: ' + error.message);
    }
  };

  const handleOpenDialog = () => {
    setNuevoPlan({
      nombre: '',
      descripcion: '',
      precio: '',
      frecuencia: 1
    });
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setOpenEditDialog(false);
  };

  const handleOpenEdit = (plan) => {
    setSelectedPlan({
      ...plan,
      precio: plan.precio.toString()
    });
    setOpenEditDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase
        .from('planes')
        .insert([{
          nombre: nuevoPlan.nombre,
          descripcion: nuevoPlan.descripcion,
          precio: Number(nuevoPlan.precio),
          frecuencia: Number(nuevoPlan.frecuencia),
          duracion_dias: 30,
          activo: true
        }]);

      if (error) throw error;
      
      setSuccess('Plan creado correctamente');
      setOpenDialog(false);
      cargarPlanes();
    } catch (error) {
      console.error('Error al crear plan:', error.message);
      setError('Error al crear el plan: ' + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('planes')
        .update({
          nombre: selectedPlan.nombre,
          descripcion: selectedPlan.descripcion,
          precio: Number(selectedPlan.precio),
          frecuencia: Number(selectedPlan.frecuencia),
          duracion_dias: selectedPlan.duracion_dias || 30,
          activo: selectedPlan.activo !== undefined ? selectedPlan.activo : true
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;
      
      setSuccess('Plan actualizado correctamente');
      setOpenEditDialog(false);
      cargarPlanes();
    } catch (error) {
      console.error('Error al actualizar plan:', error.message);
      setError('Error al actualizar el plan: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro que desea eliminar este plan?')) return;
    
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('planes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Plan eliminado correctamente');
      cargarPlanes();
    } catch (error) {
      console.error('Error al eliminar plan:', error.message);
      setError('Error al eliminar el plan: ' + error.message);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gestión de Planes</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenDialog}
        >
          Nuevo Plan
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
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>Frecuencia (veces/semana)</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {planes.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.nombre}</TableCell>
                <TableCell>{plan.descripcion}</TableCell>
                <TableCell>${plan.precio}</TableCell>
                <TableCell>{plan.frecuencia} veces por semana</TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleOpenEdit(plan)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDelete(plan.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para nuevo plan */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Plan</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={nuevoPlan.nombre}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, nombre: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción"
                  value={nuevoPlan.descripcion}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, descripcion: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Precio"
                  type="number"
                  value={nuevoPlan.precio}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, precio: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frecuencia (veces por semana)</InputLabel>
                  <Select
                    value={nuevoPlan.frecuencia}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, frecuencia: e.target.value })}
                    label="Frecuencia (veces por semana)"
                    required
                  >
                    <MenuItem value={1}>1 vez por semana</MenuItem>
                    <MenuItem value={2}>2 veces por semana</MenuItem>
                    <MenuItem value={3}>3 veces por semana</MenuItem>
                    <MenuItem value={4}>4 veces por semana</MenuItem>
                    <MenuItem value={5}>5 veces por semana</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar plan */}
      <Dialog open={openEditDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Plan</DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={selectedPlan.nombre}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, nombre: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descripción"
                    value={selectedPlan.descripcion}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, descripcion: e.target.value })}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Precio"
                    type="number"
                    value={selectedPlan.precio}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, precio: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Frecuencia (veces por semana)</InputLabel>
                    <Select
                      value={selectedPlan.frecuencia}
                      onChange={(e) => setSelectedPlan({ ...selectedPlan, frecuencia: e.target.value })}
                      label="Frecuencia (veces por semana)"
                      required
                    >
                      <MenuItem value={1}>1 vez por semana</MenuItem>
                      <MenuItem value={2}>2 veces por semana</MenuItem>
                      <MenuItem value={3}>3 veces por semana</MenuItem>
                      <MenuItem value={4}>4 veces por semana</MenuItem>
                      <MenuItem value={5}>5 veces por semana</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Planes; 