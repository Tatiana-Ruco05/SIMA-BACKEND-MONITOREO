const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const {
  createManualAlertController,
  reevaluateAttendanceAlertController,
  reevaluateObservationAlertController,
} = require('../controller/alertscontroller');

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