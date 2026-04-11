const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const {
  createManualAlertController,
  reevaluateAttendanceAlertController,
  reevaluateObservationAlertController,
  getAlerts,
  getAlertById,
  updateAlertStatus,
} = require('../controller/alertscontroller');

router.get(
  '/',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getAlerts
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getAlertById
);

router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  updateAlertStatus
);

router.post(
  '/manual',
  authMiddleware,
  requireRole('instructor', 'coordinador'),
  createManualAlertController
);

router.post(
  '/reevaluate/attendance/:idAprendiz',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  reevaluateAttendanceAlertController
);

router.post(
  '/reevaluate/observations/:idAprendiz',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  reevaluateObservationAlertController
);

module.exports = router;