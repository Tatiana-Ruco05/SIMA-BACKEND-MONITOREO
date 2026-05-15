const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');

const app = express();
const authRoutes = require('./routes/authroutes');
const usersRoutes = require('./routes/usersroutes');
const rolesRoutes = require('./routes/rolesroutes');
const permissionsRoutes = require('./routes/permissionsroutes');
const apprenticesRoutes = require('./routes/apprenticesroutes');
const observationsRoutes = require('./routes/observationsroutes');
const profileRoutes = require('./routes/profileRoutes');

// coordinacion
const dashboardRoutes = require('./routes/dashboardRoutes');
const coordinatorAreasRoutes = require('./routes/coordinatorAreasRoutes');
const groupsRoutes = require('./routes/groupsRoutes');
const formativeProgramsRoutes = require('./routes/formativeProgramsRoutes');

// alertas
const alertsRoutes = require('./routes/alertsroutes');

const errorMiddleware = require('./middlewares/errormiddleware');

app.use(helmet());
const corsOrigins = env.CORS_ORIGIN === '*'
  ? '*'
  : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'API de control de acceso por roles funcionando',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/apprentices', apprenticesRoutes);
app.use('/api/observations', observationsRoutes);
app.use('/api/profile', profileRoutes);

// Rutas especificas para coordinadores
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coordinator-areas', coordinatorAreasRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/formative-programs', formativeProgramsRoutes);

// Rutas para alertas
app.use('/api/alerts', alertsRoutes);

app.use(errorMiddleware);

module.exports = app;
