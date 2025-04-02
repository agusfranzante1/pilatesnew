import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Tooltip
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PaymentIcon from '@mui/icons-material/Payment';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LogoutIcon from '@mui/icons-material/Logout';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

function Navigation() {
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    { text: 'Alumnos', icon: <PeopleIcon />, path: '/' },
    { text: 'Turnos', icon: <CalendarMonthIcon />, path: '/turnos' },
    { text: 'Pagos', icon: <PaymentIcon />, path: '/pagos' },
    { text: 'Planes', icon: <ListAltIcon />, path: '/planes' },
    { text: 'Asistencia', icon: <HowToRegIcon />, path: '/asistencia' }
  ];

  const secondaryItems = [
    { text: 'Ver Calendario Público', icon: <CalendarMonthIcon />, path: '/turnos-publicos' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            Pilates Setier
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          
          {secondaryItems.length > 0 && (
            <>
              <Box sx={{ mx: 2, my: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Acceso Público
                </Typography>
              </Box>
              <List>
                {secondaryItems.map((item) => (
                  <Tooltip title="Ver turnos disponibles (acceso público)" key={item.text}>
                    <ListItem
                      button
                      component={Link}
                      to={item.path}
                      selected={location.pathname === item.path}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  </Tooltip>
                ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}

export default Navigation; 