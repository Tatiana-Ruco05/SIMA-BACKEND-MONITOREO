const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AprendizGrupo = sequelize.define(
  'AprendizGrupo',
  {
    id_aprendiz_grupo: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    id_aprendiz: {
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
    tableName: 'aprendiz_grupo',
    timestamps: false,
  }
);

module.exports = AprendizGrupo;
