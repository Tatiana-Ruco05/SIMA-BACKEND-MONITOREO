const express = require('express');
const router = express.Router();
const multer = require('multer');

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');

const {
  getApprentices,
  getFichasActivas,
  getAprendicesListado,
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

// Lista base de aprendices
router.get(
  '/',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getApprentices
);

// Fichas activas visibles para registro
router.get(
  '/fichas-activas',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getFichasActivas
);

// Listado enriquecido de aprendices
router.get(
  '/listado',
  authMiddleware,
  requireRole('coordinador', 'instructor'),
  getAprendicesListado
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

module.exports = router;