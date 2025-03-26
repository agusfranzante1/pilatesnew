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
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../config/supabaseClient';
import { es } from 'date-fns/locale';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DeleteIcon from '@mui/icons-material/Delete';

function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedPago, setSelectedPago] = useState(null);
  const [nuevoPago, setNuevoPago] = useState({
    alumno_id: '',
    fecha_inicio: new Date(),
    fecha_fin: new Date(),
    monto: '',
    frecuencia: 1
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    cargarPagos();
    cargarAlumnos();
  }, []);

  const cargarPagos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          alumnos (
            nombre
          )
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      // Convertir las fechas a objetos Date
      const pagosConFechas = data?.map(pago => ({
        ...pago,
        fecha_inicio: new Date(pago.fecha_inicio),
        fecha_fin: new Date(pago.fecha_fin)
      })) || [];

      console.log('Pagos cargados:', pagosConFechas);
      setPagos(pagosConFechas);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
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

  const handleOpenEdit = (pago) => {
    console.log('Editando pago:', pago);
    setSelectedPago({
      ...pago,
      fecha_inicio: new Date(pago.fecha_inicio),
      fecha_fin: new Date(pago.fecha_fin)
    });
    setOpenEditDialog(true);
  };

  const handleFechaInicioChange = (fecha) => {
    setNuevoPago(prev => ({
      ...prev,
      fecha_inicio: fecha,
      fecha_fin: new Date(fecha.setMonth(fecha.getMonth() + 1))
    }));
  };

  const handleFechaInicioEditChange = (fecha) => {
    setSelectedPago(prev => ({
      ...prev,
      fecha_inicio: fecha,
      fecha_fin: new Date(fecha.setMonth(fecha.getMonth() + 1))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const pagoParaGuardar = {
        alumno_id: nuevoPago.alumno_id,
        fecha_inicio: nuevoPago.fecha_inicio.toISOString().split('T')[0],
        fecha_fin: nuevoPago.fecha_fin.toISOString().split('T')[0],
        monto: parseFloat(nuevoPago.monto),
        frecuencia: parseInt(nuevoPago.frecuencia)
      };

      console.log('Guardando pago:', pagoParaGuardar);

      const { error } = await supabase
        .from('pagos')
        .insert([pagoParaGuardar]);

      if (error) throw error;

      setSuccess('Pago creado exitosamente');
      setOpenDialog(false);
      setNuevoPago({
        alumno_id: '',
        fecha_inicio: new Date(),
        fecha_fin: new Date(),
        monto: '',
        frecuencia: 1
      });
      await cargarPagos();
    } catch (error) {
      console.error('Error al crear pago:', error);
      setError('Error al crear el pago: ' + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const pagoActualizado = {
        alumno_id: selectedPago.alumno_id,
        fecha_inicio: selectedPago.fecha_inicio.toISOString().split('T')[0],
        fecha_fin: selectedPago.fecha_fin.toISOString().split('T')[0],
        monto: parseFloat(selectedPago.monto),
        frecuencia: parseInt(selectedPago.frecuencia)
      };

      console.log('Actualizando pago:', pagoActualizado);

      const { error } = await supabase
        .from('pagos')
        .update(pagoActualizado)
        .eq('id', selectedPago.id);

      if (error) throw error;

      setSuccess('Pago actualizado exitosamente');
      setOpenEditDialog(false);
      setSelectedPago(null);
      await cargarPagos();
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      setError('Error al actualizar el pago: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      setSuccess('Pago eliminado exitosamente');
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
      fecha_fin: new Date(),
      monto: '',
      frecuencia: 1
    });
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
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.map((pago) => (
              <TableRow key={pago.id}>
                <TableCell>{pago.alumnos?.nombre}</TableCell>
                <TableCell>{pago.fecha_inicio.toLocaleDateString()}</TableCell>
                <TableCell>{pago.fecha_fin.toLocaleDateString()}</TableCell>
                <TableCell>${pago.monto}</TableCell>
                <TableCell>{pago.frecuencia} veces por semana</TableCell>
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
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Pago</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Alumno</InputLabel>
                  <Select
                    value={nuevoPago.alumno_id}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, alumno_id: e.target.value })}
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
                    value={nuevoPago.fecha_inicio}
                    onChange={handleFechaInicioChange}
                    renderInput={(params) => <TextField {...params} fullWidth required />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
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
                <FormControl fullWidth>
                  <InputLabel>Frecuencia (veces por semana)</InputLabel>
                  <Select
                    value={nuevoPago.frecuencia}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, frecuencia: e.target.value })}
                    label="Frecuencia (veces por semana)"
                    required
                  >
                    <MenuItem value={1}>1 vez por semana</MenuItem>
                    <MenuItem value={2}>2 veces por semana</MenuItem>
                    <MenuItem value={3}>3 veces por semana</MenuItem>
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
                      onChange={(e) => setSelectedPago({ ...selectedPago, alumno_id: e.target.value })}
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
                      onChange={handleFechaInicioEditChange}
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
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Pagos; 