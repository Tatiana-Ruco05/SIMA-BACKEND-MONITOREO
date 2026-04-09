const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceJustification = sequelize.define(
  'AttendanceJustification',
  {
    id_justificacion: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_asistencia: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
    },
    id_aprendiz: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    archivo_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    comentario_aprendiz: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA'),
      allowNull: false,
      defaultValue: 'PENDIENTE',
    },
    fecha_envio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    revisada_por: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    fecha_revision: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    comentario_instructor: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'justificaciones_asistencia',
    timestamps: false,
  }
);

module.exports = AttendanceJustification;