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
    id_sesion_formacion: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
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
      defaultValue: 'INASISTENTE',
    },
    hora_registro: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    origen: {
      type: DataTypes.ENUM('QR', 'IOT_HUELLA', 'BIOMETRICO', 'BIOMETRIA_MOVIL', 'MANUAL', 'AUTOMATICO_CIERRE'),
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
  },
  {
    tableName: 'asistencias',
    timestamps: false,
  }
);

// Hooks para integracion automatica del motor de alertas
Attendance.addHook('afterCreate', async (attendance, options) => {
  if (['INASISTENTE', 'JUSTIFICADA'].includes(attendance.estado_asistencia)) {
    try {
      const AlertService = require('../services/AlertService');
      await AlertService.evaluateInattendanceAlert(attendance.id_aprendiz);
    } catch (err) {
      console.error('Error al evaluar alerta de inasistencia despues de creacion:', err);
    }
  }
});

Attendance.addHook('afterUpdate', async (attendance, options) => {
  if (attendance.changed('estado_asistencia')) {
    try {
      const AlertService = require('../services/AlertService');
      await AlertService.evaluateInattendanceAlert(attendance.id_aprendiz);
    } catch (err) {
      console.error('Error al evaluar alerta de inasistencia despues de actualizacion:', err);
    }
  }
});

module.exports = Attendance;
