const { Op } = require('sequelize');
const {
  Alert,
  Notification,
  Observation,
  ValidAbsencesView,
  ApprenticeGroup,
  Group,
  Instructor,
  CoordinatorArea,
} = require('../models');

const ALERT_STATES_OPEN = ['ACTIVA', 'EN_SEGUIMIENTO'];

const normalizeDate = (dateValue) => {
  const d = new Date(dateValue);
  d.setHours(0, 0, 0, 0);
  return d;
};

const diffDays = (a, b) => {
  const ms = normalizeDate(a).getTime() - normalizeDate(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const getActiveGroupIdsForApprentice = async (id_aprendiz) => {
  const links = await ApprenticeGroup.findAll({
    where: {
      id_aprendiz,
      estado: 'ACTIVO',
    },
    attributes: ['id_grupo'],
  });

  return links.map((item) => item.id_grupo);
};

const getMainGroupForApprentice = async (id_aprendiz, fallbackGroupId = null) => {
  if (fallbackGroupId) {
    return Group.findByPk(fallbackGroupId);
  }

  const groupIds = await getActiveGroupIdsForApprentice(id_aprendiz);
  if (!groupIds.length) return null;

  return Group.findByPk(groupIds[0]);
};

const createNotificationIfNotExists = async ({
  id_usuario,
  id_alerta,
  titulo,
  mensaje,
  tipo = 'ALERTA',
}) => {
  const existing = await Notification.findOne({
    where: {
      id_usuario,
      id_alerta,
      titulo,
      mensaje,
      tipo,
      leida: false,
    },
  });

  if (existing) return existing;

  return Notification.create({
    id_usuario,
    id_alerta,
    titulo,
    mensaje,
    tipo,
    leida: false,
  });
};

const notifyActorsForAlert = async ({
  alert,
  group,
  idInstructorGenerador = null,
}) => {
  if (!group) return;

  const notified = new Set();

  // 1. líder del grupo
  if (group.id_instructor_lider) {
    const leader = await Instructor.findByPk(group.id_instructor_lider, {
      attributes: ['id_usuario'],
    });

    if (leader?.id_usuario && !notified.has(String(leader.id_usuario))) {
      await createNotificationIfNotExists({
        id_usuario: leader.id_usuario,
        id_alerta: alert.id_alerta,
        titulo: 'Nueva alerta de aprendiz',
        mensaje: `Se registró una alerta ${alert.tipo_alerta} para un aprendiz de la ficha ${group.numero_ficha}.`,
      });

      notified.add(String(leader.id_usuario));
    }
  }

  // 2. instructor generador
  if (idInstructorGenerador) {
    const generator = await Instructor.findByPk(idInstructorGenerador, {
      attributes: ['id_usuario'],
    });

    if (generator?.id_usuario && !notified.has(String(generator.id_usuario))) {
      await createNotificationIfNotExists({
        id_usuario: generator.id_usuario,
        id_alerta: alert.id_alerta,
        titulo: 'Alerta registrada',
        mensaje: `La alerta ${alert.tipo_alerta} fue registrada correctamente para el aprendiz.`,
      });

      notified.add(String(generator.id_usuario));
    }
  }

  // 3. coordinadores del área solo si es GRAVE o CRITICA
  if (['GRAVE', 'CRITICA'].includes(alert.severidad) && group.id_area) {
    const coordinators = await CoordinatorArea.findAll({
      where: {
        id_area: group.id_area,
        estado: 'ACTIVO',
      },
      attributes: ['id_usuario'],
    });

    for (const coordinator of coordinators) {
      if (!notified.has(String(coordinator.id_usuario))) {
        await createNotificationIfNotExists({
          id_usuario: coordinator.id_usuario,
          id_alerta: alert.id_alerta,
          titulo: 'Alerta grave de aprendiz',
          mensaje: `Se registró una alerta ${alert.severidad} en un grupo de una de tus áreas asignadas.`,
        });

        notified.add(String(coordinator.id_usuario));
      }
    }
  }
};

const closeOpenAlertByType = async (id_aprendiz, tipo_alerta) => {
  const alert = await Alert.findOne({
    where: {
      id_aprendiz,
      tipo_alerta,
      estado: {
        [Op.in]: ALERT_STATES_OPEN,
      },
    },
    order: [['id_alerta', 'DESC']],
  });

  if (!alert) return null;

  await alert.update({
    estado: 'CERRADA',
  });

  return alert;
};

const createOrUpdateAlert = async ({
  id_aprendiz,
  tipo_alerta,
  regla_disparo,
  origen,
  severidad,
  descripcion,
  id_observacion = null,
  idGrupo = null,
  idInstructorGenerador = null,
  fechaInicio = null,
  fechaFin = null,
  creada_por = null,
}) => {
  let alert = await Alert.findOne({
    where: {
      id_aprendiz,
      tipo_alerta,
      estado: {
        [Op.in]: ALERT_STATES_OPEN,
      },
    },
    order: [['id_alerta', 'DESC']],
  });

  const payload = {
    id_aprendiz,
    id_observacion,
    tipo_alerta,
    regla_disparo,
    origen,
    severidad,
    descripcion,
    fecha_inicio_evaluada: fechaInicio,
    fecha_fin_evaluada: fechaFin,
    creada_por,
  };

  let created = false;

  if (alert) {
    await alert.update(payload);
  } else {
    alert = await Alert.create({
      ...payload,
      estado: 'ACTIVA',
    });
    created = true;
  }

  const group = await getMainGroupForApprentice(id_aprendiz, idGrupo);

  // notificar en creación o si quedó grave/critica
  if (created || ['GRAVE', 'CRITICA'].includes(alert.severidad)) {
    await notifyActorsForAlert({
      alert,
      group,
      idInstructorGenerador,
    });
  }

  return alert;
};

const evaluateInattendanceAlert = async (id_aprendiz) => {
  const rows = await ValidAbsencesView.findAll({
    where: { id_aprendiz },
    order: [['fecha_clase', 'ASC']],
  });

  if (!rows.length) {
    await closeOpenAlertByType(id_aprendiz, 'INASISTENCIA');
    return null;
  }

  const dates = rows.map((r) => normalizeDate(r.fecha_clase));
  const uniqueDates = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))];

  let maxConsecutive = 1;
  let currentConsecutive = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff = diffDays(dates[i], dates[i - 1]);

    if (diff === 1) {
      currentConsecutive += 1;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
      }
    } else if (diff > 1) {
      currentConsecutive = 1;
    }
  }

  const latest = rows[rows.length - 1];

  if (maxConsecutive >= 3) {
    return createOrUpdateAlert({
      id_aprendiz,
      tipo_alerta: 'INASISTENCIA',
      regla_disparo: '3_CONSECUTIVAS',
      origen: 'AUTOMATICA',
      severidad: 'GRAVE',
      descripcion: 'Se detectaron 3 o más inasistencias consecutivas sin justificación aprobada.',
      idGrupo: latest.id_grupo,
      fechaInicio: rows[0].fecha_clase,
      fechaFin: latest.fecha_clase,
    });
  }

  if (uniqueDates.length >= 5) {
    return createOrUpdateAlert({
      id_aprendiz,
      tipo_alerta: 'INASISTENCIA',
      regla_disparo: '5_DISTINTOS_DIAS',
      origen: 'AUTOMATICA',
      severidad: 'MODERADA',
      descripcion: 'Se detectaron 5 o más inasistencias en días distintos sin justificación aprobada.',
      idGrupo: latest.id_grupo,
      fechaInicio: rows[0].fecha_clase,
      fechaFin: latest.fecha_clase,
    });
  }

  await closeOpenAlertByType(id_aprendiz, 'INASISTENCIA');
  return null;
};

const evaluateObservationAlert = async (id_aprendiz) => {
  const today = new Date();
  const last30 = new Date();
  last30.setDate(today.getDate() - 30);

  const openObservations = await Observation.findAll({
    where: {
      id_aprendiz,
      estado: 'ABIERTA',
      fecha_observacion: {
        [Op.gte]: last30,
      },
    },
    order: [['fecha_observacion', 'DESC']],
  });

  if (!openObservations.length) {
    await closeOpenAlertByType(id_aprendiz, 'OBSERVACIONES_RECURRENTES');
    return null;
  }

  const graveObservation = openObservations.find((o) => o.severidad === 'GRAVE');
  const latest = openObservations[0];

  if (graveObservation) {
    return createOrUpdateAlert({
      id_aprendiz,
      id_observacion: graveObservation.id_observacion,
      tipo_alerta: 'OBSERVACIONES_RECURRENTES',
      regla_disparo: 'OBSERVACIONES_RECURRENTES',
      origen: 'AUTOMATICA',
      severidad: 'GRAVE',
      descripcion: 'Se detectó al menos una observación grave abierta en los últimos 30 días.',
      idInstructorGenerador: graveObservation.id_instructor,
      fechaInicio: last30,
      fechaFin: today,
    });
  }

  if (openObservations.length >= 3) {
    return createOrUpdateAlert({
      id_aprendiz,
      id_observacion: latest.id_observacion,
      tipo_alerta: 'OBSERVACIONES_RECURRENTES',
      regla_disparo: 'OBSERVACIONES_RECURRENTES',
      origen: 'AUTOMATICA',
      severidad: 'MODERADA',
      descripcion: 'Se detectaron 3 o más observaciones abiertas en los últimos 30 días.',
      idInstructorGenerador: latest.id_instructor,
      fechaInicio: last30,
      fechaFin: today,
    });
  }

  await closeOpenAlertByType(id_aprendiz, 'OBSERVACIONES_RECURRENTES');
  return null;
};

const createManualAlert = async ({
  id_aprendiz,
  id_instructor = null,
  id_usuario_creador = null,
  id_grupo = null,
  severidad,
  descripcion,
}) => {
  return createOrUpdateAlert({
    id_aprendiz,
    tipo_alerta: 'MANUAL',
    regla_disparo: 'MANUAL',
    origen: 'MANUAL',
    severidad,
    descripcion,
    idGrupo: id_grupo,
    idInstructorGenerador: id_instructor,
    creada_por: id_usuario_creador,
  });
};

module.exports = {
  createManualAlert,
  evaluateInattendanceAlert,
  evaluateObservationAlert,
  createOrUpdateAlert,
  closeOpenAlertByType,
};