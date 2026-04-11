const express = require('express');
const app = express();

const authRoutes = require('./routes/authroutes');
const usersRoutes = require('./routes/usersroutes');
const rolesRoutes = require('./routes/rolesroutes');
const permissionsRoutes = require('./routes/permissionsroutes');
const apprenticesRoutes = require('./routes/apprenticesroutes');

// coordinacion
const dashboardRoutes = require('./routes/dashboardRoutes');
const coordinatorAreasRoutes = require('./routes/coordinatorAreasRoutes');


// alertas
const alertsRoutes = require('./routes/alertsroutes');

const errorMiddleware = require('./middlewares/errormiddleware');

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


// Rutas específicas para coordinadores
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coordinator-areas', coordinatorAreasRoutes);



// Rutas para alertas
app.use('/api/alerts', alertsRoutes);

app.use(errorMiddleware);

module.exports = app;