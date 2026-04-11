const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const {
  assignAreaToCoordinator,
  removeAreaFromCoordinator,
  getCoordinatorAreas,
} = require('../controller/coordinatorAreasController');

router.post('/', authMiddleware, requireRole('coordinador'), assignAreaToCoordinator);
router.get('/:idUsuario', authMiddleware, requireRole('coordinador'), getCoordinatorAreas);
router.delete('/:idUsuario/:idArea', authMiddleware, requireRole('coordinador'), removeAreaFromCoordinator);

module.exports = router;