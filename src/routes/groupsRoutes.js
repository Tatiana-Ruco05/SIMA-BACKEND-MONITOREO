const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const { validateRequiredFields } = require('../middlewares/validatemiddleware');
const {
  getGroups,
  verifyFichaNumber,
  getGroupById,
  createGroup,
  updateGroup,
  changeGroupStatus,
} = require('../controller/groupsController');

// ── Lists and Details ────────────────────────────────────────────
router.get('/', authMiddleware, requireRole('coordinador'), getGroups);
router.get('/verify/:numero_ficha', authMiddleware, requireRole('coordinador'), verifyFichaNumber);
router.get('/:id', authMiddleware, requireRole('coordinador'), getGroupById);

// ── Creation ─────────────────────────────────────────────────────
router.post(
  '/',
  authMiddleware,
  requireRole('coordinador'),
  validateRequiredFields(['numero_ficha', 'id_programa', 'jornada', 'trimestres']),
  createGroup
);

// ── Updating ─────────────────────────────────────────────────
router.put(
  '/:id',
  authMiddleware,
  requireRole('coordinador'),
  updateGroup
);

// ── Status Change ──────────────────────────────────────────────
router.patch(
  '/:id/status',
  authMiddleware,
  requireRole('coordinador'),
  validateRequiredFields(['estado']),
  changeGroupStatus
);

module.exports = router;
