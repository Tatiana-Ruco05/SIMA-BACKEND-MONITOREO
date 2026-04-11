const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const {
  getCoordinatorSummary,
  getAreaDetail,
} = require('../controller/dashboardController');

router.get('/coordinador/resumen', authMiddleware, requireRole('coordinador'), getCoordinatorSummary);
router.get('/coordinador/area/:idArea', authMiddleware, requireRole('coordinador'), getAreaDetail);

module.exports = router;