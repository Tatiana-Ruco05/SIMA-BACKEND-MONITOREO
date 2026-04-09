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
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
  }
};

startServer();