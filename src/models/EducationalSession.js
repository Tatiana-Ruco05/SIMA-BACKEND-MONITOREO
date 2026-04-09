const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EducationalSession = sequelize.define(
  'EducationalSession',
  {
    id_sesion_formacion: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_horario: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_grupo: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_instructor: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_ambiente: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    fecha_clase: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    hora_inicio_programada: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    hora_fin_programada: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    hora_inicio_real: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hora_fin_real: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('PROGRAMADA', 'ABIERTA', 'CERRADA', 'CANCELADA'),
      allowNull: false,
      defaultValue: 'PROGRAMADA',
    },
    origen_apertura: {
      type: DataTypes.ENUM('AUTOMATICA_LOGIN', 'AUTOMATICA_ACCESO', 'MANUAL_RESPALDO'),
      allowNull: false,
      defaultValue: 'AUTOMATICA_LOGIN',
    },
    id_acceso_apertura: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    id_acceso_cierre: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: 'sesiones_formacion',
    timestamps: false,
  }
);

module.exports = EducationalSession;