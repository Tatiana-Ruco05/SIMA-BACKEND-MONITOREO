const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const { getProgramsByArea } = require('../controller/formativeProgramsController');

// ── Dropdown para Programas de Formación según el Área ──────────
router.get('/area/:id_area', authMiddleware, requireRole('coordinador', 'instructor'), getProgramsByArea);

module.exports = router;
