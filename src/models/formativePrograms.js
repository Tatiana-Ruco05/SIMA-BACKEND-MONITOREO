const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FormativeProgram = sequelize.define(
  'FormativeProgram',
  {
    id_programa: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre_programa: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    id_area: {
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
    tableName: 'programas_formacion',
    timestamps: false,
  }
);

module.exports = FormativeProgram;
