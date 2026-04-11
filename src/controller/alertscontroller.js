const { Apprentice, Instructor, User } = require('../models');
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

module.exports = {
  createManualAlertController,
  reevaluateAttendanceAlertController,
  reevaluateObservationAlertController,
};