const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define(
  'Attendance',
  {
    id_asistencia: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_aprendiz: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_acceso: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    estado_asistencia: {
      type: DataTypes.ENUM('PENDIENTE', 'PRESENTE', 'TARDE', 'INASISTENTE', 'JUSTIFICADA'),
      allowNull: false,
      defaultValue: 'PENDIENTE',
    },
    hora_registro: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    origen: {
      type: DataTypes.ENUM('BIOMETRICO', 'MANUAL', 'AUTOMATICO_CIERRE'),
      allowNull: false,
    },
    observacion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    creado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    actualizado_en: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    id_grupo: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_horario: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    fecha_clase: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: 'asistencias',
    timestamps: false,
  }
);

module.exports = Attendance;