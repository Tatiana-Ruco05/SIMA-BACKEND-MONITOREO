const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ValidAbsencesView = sequelize.define(
  'ValidAbsencesView',
  {
    id_asistencia: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
    },
    id_aprendiz: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
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
    estado_asistencia: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
  },
  {
    tableName: 'vw_inasistencias_validas',
    timestamps: false,
    freezeTableName: true,
  }
);

module.exports = ValidAbsencesView;