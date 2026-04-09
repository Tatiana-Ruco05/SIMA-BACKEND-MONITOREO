const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Alert = sequelize.define(
  'Alert',
  {
    id_alerta: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_aprendiz: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_observacion: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    tipo_alerta: {
      type: DataTypes.ENUM('INASISTENCIA', 'OBSERVACIONES_RECURRENTES', 'MANUAL'),
      allowNull: false,
    },
    regla_disparo: {
      type: DataTypes.ENUM('3_CONSECUTIVAS', '5_DISTINTOS_DIAS', 'OBSERVACIONES_RECURRENTES', 'MANUAL'),
      allowNull: true,
    },
    origen: {
      type: DataTypes.ENUM('AUTOMATICA', 'MANUAL'),
      allowNull: false,
    },
    severidad: {
      type: DataTypes.ENUM('LEVE', 'MODERADA', 'GRAVE', 'CRITICA'),
      allowNull: false,
      defaultValue: 'MODERADA',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA'),
      allowNull: false,
      defaultValue: 'ACTIVA',
    },
    fecha_alerta: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fecha_inicio_evaluada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fecha_fin_evaluada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    creada_por: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: 'alertas',
    timestamps: false,
  }
);

module.exports = Alert;