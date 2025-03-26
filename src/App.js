import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Alumnos from './pages/Alumnos';
import Turnos from './pages/Turnos';
import Pagos from './pages/Pagos';
import TurnosPublicos from './pages/TurnosPublicos';
import Asistencia from './pages/Asistencia';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5c6bc0',
    },
    secondary: {
      main: '#26a69a',
    },
  },
});

function MainLayout({ children }) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Navigation />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          width: '100%',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/turnos-publicos" element={<TurnosPublicos />} />
              
              {/* Rutas protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={
                  <MainLayout>
                    <Alumnos />
                  </MainLayout>
                } />
                <Route path="/turnos" element={
                  <MainLayout>
                    <Turnos />
                  </MainLayout>
                } />
                <Route path="/pagos" element={
                  <MainLayout>
                    <Pagos />
                  </MainLayout>
                } />
                <Route path="/asistencia" element={
                  <MainLayout>
                    <Asistencia />
                  </MainLayout>
                } />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
