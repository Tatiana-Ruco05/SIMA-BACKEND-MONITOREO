const express = require('express');
const router = express.Router();
const multer = require('multer');

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');

const {
  getApprenticesByGroup,
  getAprendicesListado,
  getFichasActivas,
  getApprenticeById,
  registrarIndividual,
  registrarMasivo,
  validacionesRegistro,
} = require('../controller/apprenticescontroller');

// ── Multer: recepción de archivos Excel en memoria ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const mimePermitidos = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (mimePermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo se aceptan archivos .xlsx o .xls'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── Rutas ───────────────────────────────────────────────────────────────────


// Fichas activas para poblar select de registro
router.get(
  '/fichas-activas',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getFichasActivas
);

// Listado administrativo global (paginado + filtros)
router.get(
  '/listado',
  authMiddleware,
  requireRole('coordinador'),
  getAprendicesListado
);

// Aprendices de un grupo específico (operativo, paginado + filtros)
router.get(
  '/grupo/:idGrupo',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getApprenticesByGroup
);

// Registro individual (coordinador + instructor líder de ficha)
router.post(
  '/registro',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  validacionesRegistro,
  registrarIndividual
);

// Registro masivo solo para coordinador
router.post(
  '/registro-masivo',
  authMiddleware,
  requireRole('coordinador'),
  upload.single('archivo'),
  registrarMasivo
);

// Detalle individual de un aprendiz (SIEMPRE al final — captura /:id)
router.get(
  '/:id',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getApprenticeById
);

module.exports = router;