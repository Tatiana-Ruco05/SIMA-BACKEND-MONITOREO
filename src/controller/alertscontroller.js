const AlertService = require('../services/AlertService');
const { successResponse, errorResponse } = require('../helpers/response');

const createManualAlertController = async (req, res) => {
  try {
    const { id_aprendiz, severidad, descripcion, id_grupo } = req.body;
    if (!id_aprendiz || !severidad || !descripcion) {
      return errorResponse(res, 'id_aprendiz, severidad y descripcion son obligatorios', 400);
    }
    const alert = await AlertService.createManualAlert(req.body, req.user);
    return successResponse(res, 'Alerta manual creada/actualizada correctamente', alert, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al crear alerta manual', error.status || 500);
  }
};

const reevaluateAttendanceAlertController = async (req, res) => {
  try {
    const { idAprendiz } = req.params;
    const result = await AlertService.evaluateInattendanceAlert(idAprendiz);
    return successResponse(res, 'Evaluación de alerta por inasistencia completada', result);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al evaluar alerta por inasistencia', error.status || 500);
  }
};

const reevaluateObservationAlertController = async (req, res) => {
  try {
    const { idAprendiz } = req.params;
    const result = await AlertService.evaluateObservationAlert(idAprendiz);
    return successResponse(res, 'Evaluación de alerta por observaciones completada', result);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al evaluar alerta por observaciones', error.status || 500);
  }
};

const getAlerts = async (req, res) => {
  try {
    const alerts = await AlertService.getAlerts(req.query, req.user);
    return successResponse(res, 'Alertas obtenidas correctamente', alerts);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al obtener alertas', error.status || 500);
  }
};

const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await AlertService.getAlertById(id, req.user);
    return successResponse(res, 'Alerta obtenida correctamente', alert);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al obtener alerta', error.status || 500);
  }
};

const updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const alert = await AlertService.updateAlertStatus(id, estado, req.user);
    return successResponse(res, 'Estado de alerta actualizado correctamente', alert);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al actualizar el estado de la alerta', error.status || 500);
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