# Sistema de Gestión de Pilates

Este sistema permite gestionar alumnos, pagos y turnos para un centro de pilates.

## Características

- Gestión de alumnos (registro, edición)
- Control de pagos mensuales
- Gestión de turnos con calendario interactivo
- Validación automática de frecuencia de turnos según el plan contratado
- Interfaz intuitiva y fácil de usar

## Requisitos Previos

- Node.js (v14 o superior)
- npm (v6 o superior)
- Cuenta en Supabase

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd pilates-gestion
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:
```
REACT_APP_SUPABASE_URL=tu_url_de_supabase
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key
```

4. Configurar la base de datos:
- Crear un nuevo proyecto en Supabase
- Ejecutar el script SQL en `supabase/migrations/20240320000000_initial_schema.sql`

5. Iniciar el servidor de desarrollo:
```bash
npm start
```

## Estructura de la Base de Datos

### Tabla: alumnos
- id (UUID, PK)
- nombre (TEXT)
- email (TEXT, UNIQUE)
- telefono (TEXT)
- created_at (TIMESTAMP)

### Tabla: pagos
- id (UUID, PK)
- alumno_id (UUID, FK)
- monto (DECIMAL)
- frecuencia (INTEGER)
- fecha_inicio (DATE)
- fecha_fin (DATE)
- created_at (TIMESTAMP)

### Tabla: turnos
- id (UUID, PK)
- alumno_id (UUID, FK)
- fecha (DATE)
- hora (TIME)
- created_at (TIMESTAMP)

## Uso

1. **Gestión de Alumnos**
   - Registrar nuevos alumnos
   - Ver lista de alumnos
   - Editar información de alumnos

2. **Gestión de Pagos**
   - Registrar pagos mensuales
   - Seleccionar frecuencia de entrenamiento (1-4 veces por semana)
   - Establecer fecha de inicio y fin del período

3. **Gestión de Turnos**
   - Ver calendario de turnos
   - Asignar turnos a alumnos
   - Validación automática de frecuencia según el plan contratado

## Tecnologías Utilizadas

- React
- Material-UI
- FullCalendar
- Supabase
- Node.js

## Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
