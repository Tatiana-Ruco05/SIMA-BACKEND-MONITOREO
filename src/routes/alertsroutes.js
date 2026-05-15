const express = require('express');
const { body, param, query } = require('express-validator');

const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const { validateRequest } = require('../middlewares/validatemiddleware');
const {
  createAlertFromObservationsController,
  createManualAlertController,
  reevaluateAttendanceAlertController,
  reevaluateObservationAlertController,
  getAlerts,
  getAlertById,
  getAlertObservationsController,
  updateAlertStatus,
} = require('../controller/alertscontroller');

const alertTypes = ['INASISTENCIA', 'OBSERVACIONES_RECURRENTES', 'MANUAL'];
const alertSeverities = ['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'];
const manualAlertSeverities = ['LEVE', 'MODERADA', 'GRAVE'];
const alertStates = ['ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA'];

const idParamValidation = (name) => param(name).isInt({ min: 1 }).withMessage(`${name} debe ser un entero positivo`);

const queryFilterValidations = [
  query('q').optional().trim().isLength({ min: 1 }).withMessage('q no puede estar vacio'),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero positivo'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit debe ser un entero positivo'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset debe ser un entero mayor o igual a cero'),
  query('estado').optional().isIn(alertStates).withMessage('estado invalido'),
  query('severidad').optional().isIn(alertSeverities).withMessage('severidad invalida'),
  query('tipo_alerta').optional().isIn(alertTypes).withMessage('tipo_alerta invalido'),
  query('id_aprendiz').optional().isInt({ min: 1 }).withMessage('id_aprendiz debe ser un entero positivo'),
  query('id_grupo').optional().isInt({ min: 1 }).withMessage('id_grupo debe ser un entero positivo'),
  query('fecha_desde').optional().isISO8601().withMessage('fecha_desde debe ser una fecha valida'),
  query('fecha_hasta').optional().isISO8601().withMessage('fecha_hasta debe ser una fecha valida'),
];

const createAlertFromObservationsValidations = [
  body('id_aprendiz').isInt({ min: 1 }).withMessage('id_aprendiz es obligatorio y debe ser entero positivo'),
  body('id_grupo').isInt({ min: 1 }).withMessage('id_grupo es obligatorio y debe ser entero positivo'),
  body('severidad').isIn(manualAlertSeverities).withMessage('severidad debe ser LEVE, MODERADA o GRAVE'),
  body('descripcion').trim().isLength({ min: 10 }).withMessage('descripcion es obligatoria'),
  body('observationIds').isArray({ min: 1 }).withMessage('Debe asociar al menos una observacion'),
  body('observationIds.*').isInt({ min: 1 }).withMessage('Cada observacion debe ser un entero positivo'),
  body('notificar_coordinador').optional().isBoolean().withMessage('notificar_coordinador debe ser booleano'),
];

const createManualAlertValidations = [
  body('id_aprendiz').isInt({ min: 1 }).withMessage('id_aprendiz es obligatorio y debe ser entero positivo'),
  body('id_grupo').isInt({ min: 1 }).withMessage('id_grupo es obligatorio y debe ser entero positivo'),
  body('severidad').isIn(manualAlertSeverities).withMessage('severidad debe ser LEVE, MODERADA o GRAVE'),
  body('descripcion').trim().isLength({ min: 10 }).withMessage('descripcion es obligatoria'),
];

const updateStatusValidations = [
  body('estado').isIn(alertStates).withMessage('estado debe ser ACTIVA, EN_SEGUIMIENTO o CERRADA'),
  body('justificacion_cierre')
    .if(body('estado').equals('CERRADA'))
    .trim()
    .notEmpty()
    .withMessage('justificacion_cierre es obligatoria al cerrar una alerta')
    .isLength({ min: 20, max: 2000 })
    .withMessage('justificacion_cierre debe tener entre 20 y 2000 caracteres'),
];

router.get(
  '/',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  queryFilterValidations,
  validateRequest,
  getAlerts
);

router.post(
  '/from-observations',
  authMiddleware,
  requireRole('instructor'),
  createAlertFromObservationsValidations,
  validateRequest,
  createAlertFromObservationsController
);

router.post(
  '/manual',
  authMiddleware,
  requireRole('instructor', 'coordinador'),
  createManualAlertValidations,
  validateRequest,
  createManualAlertController
);

router.get(
  '/:id/observations',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  idParamValidation('id'),
  validateRequest,
  getAlertObservationsController
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  idParamValidation('id'),
  validateRequest,
  getAlertById
);

router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('coordinador'),
  idParamValidation('id'),
  updateStatusValidations,
  validateRequest,
  updateAlertStatus
);

router.post(
  '/reevaluate/attendance/:idAprendiz',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  idParamValidation('idAprendiz'),
  validateRequest,
  reevaluateAttendanceAlertController
);

router.post(
  '/reevaluate/observations/:idAprendiz',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  idParamValidation('idAprendiz'),
  validateRequest,
  reevaluateObservationAlertController
);

module.exports = router;
