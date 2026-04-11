const express = require('express');
const router = express.Router();
const { body } = require('express-validator');


const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const upload = require('../middlewares/uploadmiddleware');
const {
  getApprentices,
  getFichasActivas,
  getAprendicesListado,
  registrarIndividual,
  registrarMasivo,
} = require('../controller/apprenticescontroller');

// ── Validaciones reutilizables para el registro individual ──────────────────
const validacionesRegistro = [
  body('tipo_documento')
    .trim()
    .notEmpty().withMessage('El tipo de documento es obligatorio')
    .isIn(['CC', 'TI', 'CE', 'PA', 'PEP', 'PPT'])
    .withMessage('Tipo de documento no válido. Use: CC, TI, CE, PA, PEP o PPT'),

  body('numero_documento')
    .trim()
    .notEmpty().withMessage('El número de documento es obligatorio')
    .isLength({ min: 5, max: 20 }).withMessage('El documento debe tener entre 5 y 20 caracteres'),

  body('nombres')
    .trim()
    .notEmpty().withMessage('Los nombres son obligatorios')
    .isLength({ max: 100 }).withMessage('Los nombres no pueden superar 100 caracteres'),

  body('apellidos')
    .trim()
    .notEmpty().withMessage('Los apellidos son obligatorios')
    .isLength({ max: 100 }).withMessage('Los apellidos no pueden superar 100 caracteres'),

  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El email no tiene un formato válido')
    .isLength({ max: 120 }).withMessage('El email no puede superar 120 caracteres'),

  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 }).withMessage('El teléfono no puede superar 20 caracteres'),

  body('numero_ficha')
    .trim()
    .notEmpty().withMessage('El número de ficha es obligatorio'),
];

// ── Rutas ───────────────────────────────────────────────────────────────────

// GET /api/apprentices/ — Lista aprendices (existente)
router.get('/', authMiddleware, requireRole('coordinador', 'instructor'), getApprentices);

// GET /api/apprentices/fichas-activas — Fichas con estado ACTIVO
router.get('/fichas-activas', authMiddleware, requireRole('coordinador', 'instructor'), getFichasActivas);

// GET /api/apprentices/listado — Aprendices con datos demográficos y ficha
router.get('/listado', authMiddleware, requireRole('coordinador', 'instructor'), getAprendicesListado);

// POST /api/apprentices/registro — Registro individual con validación
router.post('/registro', authMiddleware, requireRole('coordinador'), validacionesRegistro, registrarIndividual);

// POST /api/apprentices/registro-masivo — Registro masivo vía archivo Excel
router.post('/registro-masivo', authMiddleware, requireRole('coordinador'), upload.single('archivo'), registrarMasivo);

module.exports = router;