const app = require('./app');
const { sequelize } = require('./models');
const env = require('./config/env');

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexion a la base de datos establecida correctamente');

    const server = app.listen(env.PORT, () => {
      console.log(`Servidor ejecutandose en puerto ${env.PORT}`);
    });

    const EducationalSessionService = require('./services/EducationalSessionService');
    const scheduler = setInterval(async () => {
      try {
        await EducationalSessionService.autoOpenSessions();
        await EducationalSessionService.autoCloseSessions();
      } catch (error) {
        console.error(
          'Error en planificador automatico de sesiones:',
          error.message
        );
      }
    }, 5 * 60 * 1000);

    const shutdown = async (signal) => {
      console.log(`${signal} recibido. Cerrando servidor...`);
      clearInterval(scheduler);

      server.close(async () => {
        try {
          await sequelize.close();
          process.exit(0);
        } catch (error) {
          console.error(
            'Error cerrando la conexion a la base de datos:',
            error.message
          );
          process.exit(1);
        }
      });
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

startServer();
