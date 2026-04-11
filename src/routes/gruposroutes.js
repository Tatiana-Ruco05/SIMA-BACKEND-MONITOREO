const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const { validateRequiredFields } = require('../middlewares/validatemiddleware');
const {
  getGrupos,
  verificarNumeroFicha,
  getGrupoById,
  createGrupo,
  updateGrupo,
  changeEstadoGrupo,
  getAreasFormacion,
  asignarAprendiz,
  retirarAprendiz,
  getGruposInstructor,
  getMisGruposAprendiz,
} = require('../controller/gruposcontroller');

// ── Catálogo de áreas (para el dropdown del formulario) ──────────
router.get('/areas', authMiddleware, getAreasFormacion);

// ── Listado y detalle ────────────────────────────────────────────
router.get('/instructor', authMiddleware, requireRole('instructor', 'coordinador'), getGruposInstructor);
router.get('/aprendiz', authMiddleware, requireRole('aprendiz'), getMisGruposAprendiz);
router.get('/', authMiddleware, requireRole('coordinador'), getGrupos);
router.get('/verificar/:numero_ficha', authMiddleware, requireRole('coordinador'), verificarNumeroFicha);
router.get('/:id', authMiddleware, requireRole('coordinador'), getGrupoById);

// ── Creación ─────────────────────────────────────────────────────
router.post(
  '/',
  authMiddleware,
  requireRole('coordinador'),
  validateRequiredFields(['numero_ficha', 'id_area', 'programa', 'jornada', 'trimestres']),
  createGrupo
);

// ── Actualización ─────────────────────────────────────────────────
router.put(
  '/:id',
  authMiddleware,
  requireRole('coordinador'),
  updateGrupo
);

// ── Cambio de estado ──────────────────────────────────────────────
router.patch(
  '/:id/estado',
  authMiddleware,
  requireRole('coordinador'),
  validateRequiredFields(['estado']),
  changeEstadoGrupo
);

// ── Gestión de Aprendices ─────────────────────────────────────────
router.post(
  '/:id/aprendices',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  validateRequiredFields(['id_aprendiz']),
  asignarAprendiz
);

router.delete(
  '/:id/aprendices/:id_aprendiz',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  retirarAprendiz
);

module.exports = router;
