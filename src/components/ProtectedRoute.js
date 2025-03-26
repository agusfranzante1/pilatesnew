import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

function ProtectedRoute() {
  const { isAuthenticated, loading, initialized } = useAuth();
  const location = useLocation();

  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading || !initialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirigir a la página de login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está autenticado, renderizar los componentes hijos (rutas anidadas)
  return <Outlet />;
}

export default ProtectedRoute; 