require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

const Role = sequelize.define('roles', {
  id_rol: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  nombre: DataTypes.STRING,
}, { tableName: 'roles', freezeTableName: true, timestamps: false });

const User = sequelize.define('usuarios', {
  id_usuario: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_rol: DataTypes.BIGINT,
  estado: DataTypes.STRING,
}, { tableName: 'usuarios', freezeTableName: true, timestamps: false });

const Person = sequelize.define('personas', {
  id_persona: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_usuario: DataTypes.BIGINT,
  numero_documento: DataTypes.STRING,
  nombres: DataTypes.STRING,
  apellidos: DataTypes.STRING,
}, { tableName: 'personas', freezeTableName: true, timestamps: false });

const EducationalArea = sequelize.define('areas_formacion', {
  id_area: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  nombre_area: DataTypes.STRING,
}, { tableName: 'areas_formacion', freezeTableName: true, timestamps: false });

const CoordinatorArea = sequelize.define('coordinador_area', {
  id_coordinador_area: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  id_usuario: DataTypes.BIGINT,
  id_area: DataTypes.BIGINT,
  estado: DataTypes.STRING,
}, { tableName: 'coordinador_area', freezeTableName: true, timestamps: false });

User.belongsTo(Role, { foreignKey: 'id_rol', as: 'rol' });
User.hasOne(Person, { foreignKey: 'id_usuario', as: 'persona' });

async function assignAreaToCoordinator() {
  const numeroDocumento = process.argv[2] || '1010139217';
  const idArea = Number(process.argv[3] || 1);

  if (!Number.isInteger(idArea) || idArea <= 0) {
    console.log('El id_area debe ser un entero positivo.');
    return;
  }

  const transaction = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    console.log('Conectado a la BD');

    const user = await User.findOne({
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['nombre'],
          required: true,
        },
        {
          model: Person,
          as: 'persona',
          attributes: ['numero_documento', 'nombres', 'apellidos'],
          where: { numero_documento: numeroDocumento },
          required: true,
        },
      ],
      transaction,
    });

    if (!user) {
      console.log(`No existe un usuario con documento ${numeroDocumento}.`);
      await transaction.rollback();
      return;
    }

    if (user.rol?.nombre !== 'coordinador') {
      console.log(`El usuario ${numeroDocumento} no tiene rol coordinador.`);
      await transaction.rollback();
      return;
    }

    const area = await EducationalArea.findByPk(idArea, { transaction });
    if (!area) {
      console.log(`No existe el area con id ${idArea}.`);
      await transaction.rollback();
      return;
    }

    const assignment = await CoordinatorArea.findOne({
      where: {
        id_usuario: user.id_usuario,
        id_area: idArea,
      },
      transaction,
    });

    if (assignment?.estado === 'ACTIVO') {
      console.log(`El coordinador ${numeroDocumento} ya tiene asignada activamente el area ${area.nombre_area}.`);
      await transaction.rollback();
      return;
    }

    if (assignment) {
      await assignment.update({ estado: 'ACTIVO' }, { transaction });
      await transaction.commit();
      console.log(`Asignacion reactivada: ${numeroDocumento} -> area ${area.nombre_area}`);
      return;
    }

    await CoordinatorArea.create({
      id_usuario: user.id_usuario,
      id_area: idArea,
      estado: 'ACTIVO',
    }, { transaction });

    await transaction.commit();
    console.log(`Area asignada correctamente: ${numeroDocumento} -> area ${area.nombre_area}`);
  } catch (error) {
    await transaction.rollback();
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

assignAreaToCoordinator();
