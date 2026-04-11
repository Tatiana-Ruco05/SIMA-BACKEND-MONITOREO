const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InstructorGrupo = sequelize.define(
  'InstructorGrupo',
  {
    id_instructor_grupo: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_instructor: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    id_grupo: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVO', 'INACTIVO'),
      allowNull: false,
      defaultValue: 'ACTIVO',
    },
  },
  {
    tableName: 'instructor_grupo',
    timestamps: false,
  }
);

module.exports = InstructorGrupo;
