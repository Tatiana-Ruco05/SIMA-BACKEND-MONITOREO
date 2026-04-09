const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BiometricFingerprint = sequelize.define(
  'BiometricFingerprint',
  {
    id_huella: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_dispositivo: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    codigo_huella: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fecha_enrolamiento: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    enrolado_por: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVA', 'INACTIVA'),
      allowNull: false,
      defaultValue: 'ACTIVA',
    },
  },
  {
    tableName: 'huellas_biometricas',
    timestamps: false,
  }
);

module.exports = BiometricFingerprint;