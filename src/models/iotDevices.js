const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const IoTDevice = sequelize.define(
  'IoTDevice',
  {
    id_dispositivo: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo_dispositivo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    id_ambiente: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    tipo_dispositivo: {
      type: DataTypes.ENUM('ESP32_HUELLA'),
      allowNull: false,
      defaultValue: 'ESP32_HUELLA',
    },
    estado: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO', 'MANTENIMIENTO'),
      allowNull: false,
      defaultValue: 'ACTIVO',
    },
  },
  {
    tableName: 'dispositivos_iot',
    timestamps: false,
  }
);

module.exports = IoTDevice;