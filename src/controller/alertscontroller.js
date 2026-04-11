const { Op } = require('sequelize');
const {
  Alert,
  Apprentice,
  Instructor,
  Observation,
  ApprenticeGroup,
  InstructorGroup,
  Group,
  CoordinatorArea,
} = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');
const {
  createManualAlert,
  evaluateInattendanceAlert,
  evaluateObservationAlert,
} = require('../helpers/alertEngine');

const createManualAlertController = async (req, res) => {
  try {
    const { id_aprendiz, severidad, descripcion, id_grupo } = req.body;

    if (!id_aprendiz || !severidad || !descripcion) {
      return errorResponse(res, 'id_aprendiz, severidad y descripcion son obligatorios', 400);
    }

    const apprentice = await Apprentice.findByPk(id_aprendiz);
    if (!apprentice) {
      return errorResponse(res, 'Aprendiz no encontrado', 404);
    }

    let id_instructor = null;

    if (req.user.rol === 'instructor') {
      const instructor = await Instructor.findOne({
        where: {
          id_usuario: req.user.id_usuario,
          estado: 'ACTIVO',
        },
      });

      if (!instructor) {
        return errorResponse(res, 'No existe perfil activo de instructor', 403);
      }

      id_instructor = instructor.id_instructor;
    }

    const alert = await createManualAlert({
      id_aprendiz,
      id_instructor,
      id_usuario_creador: req.user.id_usuario,
      id_grupo,
      severidad,
      descripcion,
    });

    return successResponse(res, 'Alerta manual creada/actualizada correctamente', alert, 201);
  } catch (error) {
    return errorResponse(res, 'Error al crear alerta manual', 500, error.message);
  }
};

const reevaluateAttendanceAlertController = async (req, res) => {
  try {
    const { idAprendiz } = req.params;
    const result = await evaluateInattendanceAlert(idAprendiz);

    return successResponse(res, 'Evaluación de alerta por inasistencia completada', result);
  } catch (error) {
    return errorResponse(res, 'Error al evaluar alerta por inasistencia', 500, error.message);
  }
};

const reevaluateObservationAlertController = async (req, res) => {
  try {
    const { idAprendiz } = req.params;
    const result = await evaluateObservationAlert(idAprendiz);

    return successResponse(res, 'Evaluación de alerta por observaciones completada', result);
  } catch (error) {
    return errorResponse(res, 'Error al evaluar alerta por observaciones', 500, error.message);
  }
};

const getAccessibleGroupIdsForUser = async (req) => {
  if (req.user.rol === 'coordinador') {
    const assignments = await CoordinatorArea.findAll({
      where: {
        id_usuario: req.user.id_usuario,
        estado: 'ACTIVO',
      },
      attributes: ['id_area'],
    });

    const areaIds = assignments.map((a) => a.id_area);

    if (!areaIds.length) return [];

    const groups = await Group.findAll({
      where: {
        id_area: {
          [Op.in]: areaIds,
        },
      },
      attributes: ['id_grupo'],
    });

    return groups.map((g) => g.id_grupo);
  }

  if (req.user.rol === 'instructor') {
    const instructor = await Instructor.findOne({
      where: {
        id_usuario: req.user.id_usuario,
        estado: 'ACTIVO',
      },
      attributes: ['id_instructor'],
    });

    if (!instructor) return [];

    const liderGroups = await Group.findAll({
      where: {
        id_instructor_lider: instructor.id_instructor,
      },
      attributes: ['id_grupo'],
    });

    const assignedGroups = await InstructorGroup.findAll({
      where: {
        id_instructor: instructor.id_instructor,
        estado: 'ACTIVO',
      },
      attributes: ['id_grupo'],
    });

    const ids = [
      ...liderGroups.map((g) => g.id_grupo),
      ...assignedGroups.map((g) => g.id_grupo),
    ];

    return [...new Set(ids)];
  }

  return [];
};

const getAlerts = async (req, res) => {
  try {
    if (!['coordinador', 'instructor'].includes(req.user.rol)) {
      return errorResponse(res, 'No tienes permisos para consultar alertas', 403);
    }

    const { estado, severidad, tipo_alerta, id_aprendiz } = req.query;

    const accessibleGroupIds = await getAccessibleGroupIdsForUser(req);

    if (!accessibleGroupIds.length) {
      return successResponse(res, 'Alertas obtenidas correctamente', []);
    }

    const apprenticeLinks = await ApprenticeGroup.findAll({
      where: {
        id_grupo: {
          [Op.in]: accessibleGroupIds,
        },
        estado: 'ACTIVO',
      },
      attributes: ['id_aprendiz'],
    });

    const accessibleApprenticeIds = [...new Set(apprenticeLinks.map((a) => a.id_aprendiz))];

    if (!accessibleApprenticeIds.length) {
      return successResponse(res, 'Alertas obtenidas correctamente', []);
    }

    const where = {
      id_aprendiz: {
        [Op.in]: accessibleApprenticeIds,
      },
    };

    if (estado) where.estado = estado;
    if (severidad) where.severidad = severidad;
    if (tipo_alerta) where.tipo_alerta = tipo_alerta;
    if (id_aprendiz) {
      if (!accessibleApprenticeIds.includes(Number(id_aprendiz))) {
        return errorResponse(res, 'No tienes permisos para consultar alertas de este aprendiz', 403);
      }
      where.id_aprendiz = id_aprendiz;
    }

    const alerts = await Alert.findAll({
      where,
      include: [
        {
          model: Apprentice,
          as: 'aprendiz',
          attributes: ['id_aprendiz', 'id_usuario', 'estado', 'estado_formativo'],
        },
        {
          model: Observation,
          as: 'observacion',
          required: false,
          attributes: ['id_observacion', 'tipo_observacion', 'severidad', 'estado', 'fecha_observacion'],
        },
      ],
      order: [['fecha_alerta', 'DESC']],
    });

    return successResponse(res, 'Alertas obtenidas correctamente', alerts);
  } catch (error) {
    return errorResponse(res, 'Error al obtener alertas', 500, error.message);
  }
};

const getAlertById = async (req, res) => {
  try {
    if (!['coordinador', 'instructor'].includes(req.user.rol)) {
      return errorResponse(res, 'No tienes permisos para consultar alertas', 403);
    }

    const { id } = req.params;

    const alert = await Alert.findByPk(id, {
      include: [
        {
          model: Apprentice,
          as: 'aprendiz',
          attributes: ['id_aprendiz', 'id_usuario', 'estado', 'estado_formativo'],
        },
        {
          model: Observation,
          as: 'observacion',
          required: false,
          attributes: ['id_observacion', 'tipo_observacion', 'severidad', 'estado', 'fecha_observacion', 'descripcion'],
        },
      ],
    });

    if (!alert) {
      return errorResponse(res, 'Alerta no encontrada', 404);
    }

    const accessibleGroupIds = await getAccessibleGroupIdsForUser(req);

    const apprenticeGroup = await ApprenticeGroup.findOne({
      where: {
        id_aprendiz: alert.id_aprendiz,
        id_grupo: {
          [Op.in]: accessibleGroupIds,
        },
        estado: 'ACTIVO',
      },
    });

    if (!apprenticeGroup) {
      return errorResponse(res, 'No tienes permisos para consultar esta alerta', 403);
    }

    return successResponse(res, 'Alerta obtenida correctamente', alert);
  } catch (error) {
    return errorResponse(res, 'Error al obtener alerta', 500, error.message);
  }
};

const updateAlertStatus = async (req, res) => {
  try {
    if (!['coordinador', 'instructor'].includes(req.user.rol)) {
      return errorResponse(res, 'No tienes permisos para actualizar alertas', 403);
    }

    const { id } = req.params;
    const { estado } = req.body;

    const allowedStates = ['ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA'];

    if (!estado || !allowedStates.includes(estado)) {
      return errorResponse(
        res,
        'El estado es obligatorio y debe ser ACTIVA, EN_SEGUIMIENTO o CERRADA',
        400
      );
    }

    const alert = await Alert.findByPk(id);

    if (!alert) {
      return errorResponse(res, 'Alerta no encontrada', 404);
    }

    const accessibleGroupIds = await getAccessibleGroupIdsForUser(req);

    const apprenticeGroup = await ApprenticeGroup.findOne({
      where: {
        id_aprendiz: alert.id_aprendiz,
        id_grupo: {
          [Op.in]: accessibleGroupIds,
        },
        estado: 'ACTIVO',
      },
    });

    if (!apprenticeGroup) {
      return errorResponse(res, 'No tienes permisos para actualizar esta alerta', 403);
    }

    await alert.update({ estado });

    return successResponse(res, 'Estado de alerta actualizado correctamente', alert);
  } catch (error) {
    return errorResponse(res, 'Error al actualizar el estado de la alerta', 500, error.message);
  }
};

module.exports = {
  createManualAlertController,
  reevaluateAttendanceAlertController,
  reevaluateObservationAlertController,
  getAlerts,
  getAlertById,
  updateAlertStatus,
};