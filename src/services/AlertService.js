const { Op } = require('sequelize');
const {
  Alert,
  Notification,
  Observation,
  ValidAbsencesView,
  ApprenticeGroup,
  Group,
  FormativeProgram,
  Instructor,
  CoordinatorArea,
  Apprentice,
  InstructorGroup,
} = require('../models');

const ALERT_STATES_OPEN = ['ACTIVA', 'EN_SEGUIMIENTO'];

class AlertService {

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════════

  static _normalizeDate(dateValue) {
    const d = new Date(dateValue);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  static _diffDays(a, b) {
    const ms = this._normalizeDate(a).getTime() - this._normalizeDate(b).getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  static async _getActiveGroupIdsForApprentice(id_aprendiz) {
    const links = await ApprenticeGroup.findAll({
      where: { id_aprendiz, estado: 'ACTIVO' },
      attributes: ['id_grupo'],
    });
    return links.map((item) => item.id_grupo);
  }

  static async _getMainGroupForApprentice(id_aprendiz, fallbackGroupId = null) {
    const includePrograma = { model: FormativeProgram, as: 'programa_formacion', attributes: ['id_programa', 'id_area'] };
    if (fallbackGroupId) return Group.findByPk(fallbackGroupId, { include: [includePrograma] });

    const groupIds = await this._getActiveGroupIdsForApprentice(id_aprendiz);
    if (!groupIds.length) return null;
    return Group.findByPk(groupIds[0], { include: [includePrograma] });
  }

  static async _createNotificationIfNotExists({ id_usuario, id_alerta, titulo, mensaje, tipo = 'ALERTA' }) {
    const existing = await Notification.findOne({
      where: { id_usuario, id_alerta, titulo, mensaje, tipo, leida: false },
    });
    if (existing) return existing;
    return Notification.create({ id_usuario, id_alerta, titulo, mensaje, tipo, leida: false });
  }

  static async _notifyActorsForAlert({ alert, group, idInstructorGenerador = null }) {
    if (!group) return;
    const notified = new Set();

    if (group.id_instructor_lider) {
      const leader = await Instructor.findByPk(group.id_instructor_lider, { attributes: ['id_usuario'] });
      if (leader?.id_usuario && !notified.has(String(leader.id_usuario))) {
        await this._createNotificationIfNotExists({
          id_usuario: leader.id_usuario, id_alerta: alert.id_alerta,
          titulo: 'Nueva alerta de aprendiz',
          mensaje: `Se registró una alerta ${alert.tipo_alerta} para un aprendiz de la ficha ${group.numero_ficha}.`,
        });
        notified.add(String(leader.id_usuario));
      }
    }

    if (idInstructorGenerador) {
      const generator = await Instructor.findByPk(idInstructorGenerador, { attributes: ['id_usuario'] });
      if (generator?.id_usuario && !notified.has(String(generator.id_usuario))) {
        await this._createNotificationIfNotExists({
          id_usuario: generator.id_usuario, id_alerta: alert.id_alerta,
          titulo: 'Alerta registrada',
          mensaje: `La alerta ${alert.tipo_alerta} fue registrada correctamente para el aprendiz.`,
        });
        notified.add(String(generator.id_usuario));
      }
    }

    const areaId = group.programa_formacion?.id_area;
    if (['GRAVE', 'CRITICA'].includes(alert.severidad) && areaId) {
      const coordinators = await CoordinatorArea.findAll({
        where: { id_area: areaId, estado: 'ACTIVO' },
        attributes: ['id_usuario'],
      });
      for (const coordinator of coordinators) {
        if (!notified.has(String(coordinator.id_usuario))) {
          await this._createNotificationIfNotExists({
            id_usuario: coordinator.id_usuario, id_alerta: alert.id_alerta,
            titulo: 'Alerta grave de aprendiz',
            mensaje: `Se registró una alerta ${alert.severidad} en un grupo de una de tus áreas asignadas.`,
          });
          notified.add(String(coordinator.id_usuario));
        }
      }
    }
  }

  static async closeOpenAlertByType(id_aprendiz, tipo_alerta) {
    const alert = await Alert.findOne({
      where: { id_aprendiz, tipo_alerta, estado: { [Op.in]: ALERT_STATES_OPEN } },
      order: [['id_alerta', 'DESC']],
    });
    if (!alert) return null;
    await alert.update({ estado: 'CERRADA' });
    return alert;
  }

  static async createOrUpdateAlert({ id_aprendiz, tipo_alerta, regla_disparo, origen, severidad, descripcion, id_observacion = null, idGrupo = null, idInstructorGenerador = null, fechaInicio = null, fechaFin = null, creada_por = null }) {
    let alert = await Alert.findOne({
      where: { id_aprendiz, tipo_alerta, estado: { [Op.in]: ALERT_STATES_OPEN } },
      order: [['id_alerta', 'DESC']],
    });

    const payload = { id_aprendiz, id_observacion, tipo_alerta, regla_disparo, origen, severidad, descripcion, fecha_inicio_evaluada: fechaInicio, fecha_fin_evaluada: fechaFin, creada_por };
    let created = false;

    if (alert) {
      await alert.update(payload);
    } else {
      alert = await Alert.create({ ...payload, estado: 'ACTIVA' });
      created = true;
    }

    const group = await this._getMainGroupForApprentice(id_aprendiz, idGrupo);
    if (created || ['GRAVE', 'CRITICA'].includes(alert.severidad)) {
      await this._notifyActorsForAlert({ alert, group, idInstructorGenerador });
    }
    return alert;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // REGLAS AUTOMÁTICAS
  // ═══════════════════════════════════════════════════════════════════════════════

  static async evaluateInattendanceAlert(id_aprendiz) {
    const rows = await ValidAbsencesView.findAll({ where: { id_aprendiz }, order: [['fecha_clase', 'ASC']] });
    if (!rows.length) {
      await this.closeOpenAlertByType(id_aprendiz, 'INASISTENCIA');
      return null;
    }

    const dates = rows.map((r) => this._normalizeDate(r.fecha_clase));
    const uniqueDates = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))];

    let maxConsecutive = 1; let currentConsecutive = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = this._diffDays(dates[i], dates[i - 1]);
      if (diff === 1) {
        currentConsecutive += 1;
        if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
      } else if (diff > 1) {
        currentConsecutive = 1;
      }
    }

    const latest = rows[rows.length - 1];
    if (maxConsecutive >= 3) {
      return this.createOrUpdateAlert({
        id_aprendiz, tipo_alerta: 'INASISTENCIA', regla_disparo: '3_CONSECUTIVAS', origen: 'AUTOMATICA',
        severidad: 'GRAVE', descripcion: 'Se detectaron 3 o más inasistencias consecutivas sin justificación aprobada.',
        idGrupo: latest.id_grupo, fechaInicio: rows[0].fecha_clase, fechaFin: latest.fecha_clase,
      });
    }

    if (uniqueDates.length >= 5) {
      return this.createOrUpdateAlert({
        id_aprendiz, tipo_alerta: 'INASISTENCIA', regla_disparo: '5_DISTINTOS_DIAS', origen: 'AUTOMATICA',
        severidad: 'MODERADA', descripcion: 'Se detectaron 5 o más inasistencias en días distintos sin justificación aprobada.',
        idGrupo: latest.id_grupo, fechaInicio: rows[0].fecha_clase, fechaFin: latest.fecha_clase,
      });
    }

    await this.closeOpenAlertByType(id_aprendiz, 'INASISTENCIA');
    return null;
  }

  static async evaluateObservationAlert(id_aprendiz) {
    const today = new Date();
    const last30 = new Date(); last30.setDate(today.getDate() - 30);

    const openObservations = await Observation.findAll({
      where: { id_aprendiz, estado: 'ABIERTA', fecha_observacion: { [Op.gte]: last30 } },
      order: [['fecha_observacion', 'DESC']],
    });

    if (!openObservations.length) {
      await this.closeOpenAlertByType(id_aprendiz, 'OBSERVACIONES_RECURRENTES');
      return null;
    }

    const graveObservation = openObservations.find((o) => o.severidad === 'GRAVE');
    const latest = openObservations[0];

    if (graveObservation) {
      return this.createOrUpdateAlert({
        id_aprendiz, id_observacion: graveObservation.id_observacion, tipo_alerta: 'OBSERVACIONES_RECURRENTES', regla_disparo: 'OBSERVACIONES_RECURRENTES', origen: 'AUTOMATICA',
        severidad: 'GRAVE', descripcion: 'Se detectó al menos una observación grave abierta en los últimos 30 días.',
        idInstructorGenerador: graveObservation.id_instructor, fechaInicio: last30, fechaFin: today,
      });
    }

    if (openObservations.length >= 3) {
      return this.createOrUpdateAlert({
        id_aprendiz, id_observacion: latest.id_observacion, tipo_alerta: 'OBSERVACIONES_RECURRENTES', regla_disparo: 'OBSERVACIONES_RECURRENTES', origen: 'AUTOMATICA',
        severidad: 'MODERADA', descripcion: 'Se detectaron 3 o más observaciones abiertas en los últimos 30 días.',
        idInstructorGenerador: latest.id_instructor, fechaInicio: last30, fechaFin: today,
      });
    }

    await this.closeOpenAlertByType(id_aprendiz, 'OBSERVACIONES_RECURRENTES');
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE NEGOCIO (API)
  // ═══════════════════════════════════════════════════════════════════════════════

  static async getAccessibleGroupIdsForUser(requester) {
    if (requester.rol === 'coordinador') {
      const assignments = await CoordinatorArea.findAll({
        where: { id_usuario: requester.id_usuario, estado: 'ACTIVO' }, attributes: ['id_area'],
      });
      const areaIds = assignments.map((a) => a.id_area);
      if (!areaIds.length) return [];

      const groups = await Group.findAll({
        include: [{ model: FormativeProgram, as: 'programa_formacion', attributes: [], required: true, where: { id_area: { [Op.in]: areaIds } } }],
        attributes: ['id_grupo'],
      });
      return groups.map((g) => g.id_grupo);
    }

    if (requester.rol === 'instructor') {
      const instructor = await Instructor.findOne({ where: { id_usuario: requester.id_usuario, estado: 'ACTIVO' }, attributes: ['id_instructor'] });
      if (!instructor) return [];

      const liderGroups = await Group.findAll({ where: { id_instructor_lider: instructor.id_instructor }, attributes: ['id_grupo'] });
      const assignedGroups = await InstructorGroup.findAll({ where: { id_instructor: instructor.id_instructor, estado: 'ACTIVO' }, attributes: ['id_grupo'] });

      const ids = [...liderGroups.map((g) => g.id_grupo), ...assignedGroups.map((g) => g.id_grupo)];
      return [...new Set(ids)];
    }
    return [];
  }

  static async createManualAlert(data, requester) {
    const { id_aprendiz, severidad, descripcion, id_grupo } = data;
    
    const apprentice = await Apprentice.findByPk(id_aprendiz);
    if (!apprentice) throw { status: 404, message: 'Aprendiz no encontrado' };

    const accessibleGroupIds = await this.getAccessibleGroupIdsForUser(requester);
    if (!accessibleGroupIds.length) {
      throw { status: 403, message: 'No tienes grupos asignados para crear alertas' };
    }

    const apprenticeLink = await ApprenticeGroup.findOne({
      where: {
        id_aprendiz,
        id_grupo: { [Op.in]: accessibleGroupIds },
        estado: 'ACTIVO'
      }
    });

    if (!apprenticeLink) {
      throw { status: 403, message: 'No tienes permisos para crear alertas sobre este aprendiz' };
    }

    let id_instructor = null;
    if (requester.rol === 'instructor') {
      const instructor = await Instructor.findOne({ where: { id_usuario: requester.id_usuario, estado: 'ACTIVO' } });
      if (!instructor) throw { status: 403, message: 'No existe perfil activo de instructor' };
      id_instructor = instructor.id_instructor;
    }

    return this.createOrUpdateAlert({
      id_aprendiz, tipo_alerta: 'MANUAL', regla_disparo: 'MANUAL', origen: 'MANUAL',
      severidad, descripcion, idGrupo: id_grupo, idInstructorGenerador: id_instructor, creada_por: requester.id_usuario,
    });
  }

  static async getAlerts(filters, requester) {
    if (!['coordinador', 'instructor'].includes(requester.rol)) throw { status: 403, message: 'No tienes permisos para consultar alertas' };

    const { estado, severidad, tipo_alerta, id_aprendiz } = filters;
    const accessibleGroupIds = await this.getAccessibleGroupIdsForUser(requester);
    if (!accessibleGroupIds.length) return [];

    const apprenticeLinks = await ApprenticeGroup.findAll({
      where: { id_grupo: { [Op.in]: accessibleGroupIds }, estado: 'ACTIVO' }, attributes: ['id_aprendiz'],
    });

    const accessibleApprenticeIds = [...new Set(apprenticeLinks.map((a) => a.id_aprendiz))];
    if (!accessibleApprenticeIds.length) return [];

    const where = { id_aprendiz: { [Op.in]: accessibleApprenticeIds } };
    if (estado) where.estado = estado;
    if (severidad) where.severidad = severidad;
    if (tipo_alerta) where.tipo_alerta = tipo_alerta;
    if (id_aprendiz) {
      if (!accessibleApprenticeIds.includes(Number(id_aprendiz))) throw { status: 403, message: 'No tienes permisos para consultar alertas de este aprendiz' };
      where.id_aprendiz = id_aprendiz;
    }

    return Alert.findAll({
      where,
      include: [
        { model: Apprentice, as: 'aprendiz', attributes: ['id_aprendiz', 'id_usuario', 'estado', 'estado_formativo'] },
        { model: Observation, as: 'observacion', required: false, attributes: ['id_observacion', 'tipo_observacion', 'severidad', 'estado', 'fecha_observacion'] },
      ],
      order: [['fecha_alerta', 'DESC']],
    });
  }

  static async getAlertById(id, requester) {
    if (!['coordinador', 'instructor'].includes(requester.rol)) throw { status: 403, message: 'No tienes permisos para consultar alertas' };

    const alert = await Alert.findByPk(id, {
      include: [
        { model: Apprentice, as: 'aprendiz', attributes: ['id_aprendiz', 'id_usuario', 'estado', 'estado_formativo'] },
        { model: Observation, as: 'observacion', required: false, attributes: ['id_observacion', 'tipo_observacion', 'severidad', 'estado', 'fecha_observacion', 'descripcion'] },
      ],
    });

    if (!alert) throw { status: 404, message: 'Alerta no encontrada' };

    const accessibleGroupIds = await this.getAccessibleGroupIdsForUser(requester);
    const apprenticeGroup = await ApprenticeGroup.findOne({
      where: { id_aprendiz: alert.id_aprendiz, id_grupo: { [Op.in]: accessibleGroupIds }, estado: 'ACTIVO' },
    });

    if (!apprenticeGroup) throw { status: 403, message: 'No tienes permisos para consultar esta alerta' };
    return alert;
  }

  static async updateAlertStatus(id, estado, requester) {
    if (!['coordinador', 'instructor'].includes(requester.rol)) throw { status: 403, message: 'No tienes permisos para actualizar alertas' };
    const allowedStates = ['ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA'];
    if (!estado || !allowedStates.includes(estado)) throw { status: 400, message: 'El estado es obligatorio y debe ser ACTIVA, EN_SEGUIMIENTO o CERRADA' };

    const alert = await Alert.findByPk(id);
    if (!alert) throw { status: 404, message: 'Alerta no encontrada' };

    const accessibleGroupIds = await this.getAccessibleGroupIdsForUser(requester);
    const apprenticeGroup = await ApprenticeGroup.findOne({
      where: { id_aprendiz: alert.id_aprendiz, id_grupo: { [Op.in]: accessibleGroupIds }, estado: 'ACTIVO' },
    });

    if (!apprenticeGroup) throw { status: 403, message: 'No tienes permisos para actualizar esta alerta' };

    await alert.update({ estado });
    return alert;
  }
}

module.exports = AlertService;