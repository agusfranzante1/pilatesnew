import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Alert, 
  Button, 
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { verificarEstructuraTurnos, mostrarInstruccionesMigracion } from '../utils/dbDiagnostic';

function DiagnosticoBaseDatos() {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(false);

  const ejecutarDiagnostico = async () => {
    setCargando(true);
    try {
      const diagnostico = await verificarEstructuraTurnos();
      setResultado(diagnostico);
      
      // Si no tiene el campo pago_id, mostrar instrucciones automáticamente
      if (diagnostico && !diagnostico.tienePagoId) {
        setMostrarInstrucciones(true);
      }
    } catch (error) {
      console.error('Error al ejecutar diagnóstico:', error);
      setResultado({
        success: false,
        error: 'Error inesperado: ' + error.message
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Ejecutar diagnóstico al montar el componente
    ejecutarDiagnostico();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Diagnóstico de la Base de Datos
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estado de la Estructura
          </Typography>
          
          {cargando ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : resultado ? (
            <>
              {resultado.success ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  La estructura de la base de datos es correcta. La columna pago_id existe.
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {resultado.error || 'Se detectó un problema con la estructura de la base de datos.'}
                </Alert>
              )}
              
              {resultado.nota && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {resultado.nota}
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info">
              Haga clic en "Ejecutar Diagnóstico" para verificar la estructura de la base de datos.
            </Alert>
          )}
        </CardContent>
        <CardActions>
          <Button 
            variant="contained" 
            onClick={ejecutarDiagnostico}
            disabled={cargando}
          >
            {cargando ? 'Verificando...' : 'Ejecutar Diagnóstico'}
          </Button>
          
          {resultado && !resultado.tienePagoId && (
            <Button 
              variant="outlined" 
              onClick={() => setMostrarInstrucciones(!mostrarInstrucciones)}
              color="primary"
            >
              {mostrarInstrucciones ? 'Ocultar Instrucciones' : 'Mostrar Solución'}
            </Button>
          )}
        </CardActions>
      </Card>
      
      {mostrarInstrucciones && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            Instrucciones para Solucionar el Problema
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body1" component="pre" sx={{ 
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            backgroundColor: '#f0f0f0',
            p: 2,
            borderRadius: 1
          }}>
            {mostrarInstruccionesMigracion()}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning">
              Después de aplicar la migración, debe reiniciar la aplicación para que los cambios surtan efecto.
            </Alert>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default DiagnosticoBaseDatos; 