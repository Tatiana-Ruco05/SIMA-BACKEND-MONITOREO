const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EducationalSchedule = sequelize.define(
  'EducationalSchedule',
  {
    id_horario: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
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
    dia_semana: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: '1=Lunes ... 7=Domingo',
    },
    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    tolerancia_minutos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO'),
      allowNull: false,
      defaultValue: 'ACTIVO',
    },
    trimestre: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    horarios_formacioncol: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
  },
  {
    tableName: 'horarios_formacion',
    timestamps: false,
  }
);

module.exports = EducationalSchedule;