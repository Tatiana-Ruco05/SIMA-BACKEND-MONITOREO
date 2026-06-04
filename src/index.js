const app = require('./app');
const { sequelize } = require('./models');
const env = require('./config/env');

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente');

    app.listen(env.PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${env.PORT}`);
    });

    // Planificador automatico de sesiones (ejecuta cada 5 minutos)
    const EducationalSessionService = require('./services/EducationalSessionService');
    setInterval(async () => {
      try {
        await EducationalSessionService.autoOpenSessions();
        await EducationalSessionService.autoCloseSessions();
      } catch (err) {
        console.error('Error en planificador automatico de sesiones:', err.message);
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
  }
};

startServer();