const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const {
  getCoordinatorSummary,
  getAreaDetail,
  getInstructorSummary,
} = require('../controller/dashboardController');

router.get('/coordinador/resumen', authMiddleware, requireRole('coordinador'), getCoordinatorSummary);
router.get('/coordinador/area/:idArea', authMiddleware, requireRole('coordinador'), getAreaDetail);
router.get('/instructor/resumen', authMiddleware, requireRole('instructor'), getInstructorSummary);

module.exports = router;
