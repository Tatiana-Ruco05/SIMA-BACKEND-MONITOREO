const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const { validateRequest } = require('../middlewares/validatemiddleware');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controller/userscontroller');

const createUserValidations = [
  body('email').trim().notEmpty().withMessage('El correo es obligatorio').isEmail().withMessage('Debe proporcionar un correo valido').isLength({ max: 120 }),
  body('id_rol').notEmpty().withMessage('El rol es obligatorio').isInt().withMessage('El rol debe ser un entero'),
  body('tipo_documento').trim().notEmpty().withMessage('El tipo de documento es obligatorio').isLength({ max: 10 }),
  body('numero_documento').trim().notEmpty().withMessage('El numero de documento es obligatorio').isLength({ min: 5, max: 20 }),
  body('nombres').trim().notEmpty().withMessage('Los nombres son obligatorios').isLength({ max: 100 }),
  body('apellidos').trim().notEmpty().withMessage('Los apellidos son obligatorios').isLength({ max: 100 }),
  body('telefono').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
];

const updateUserValidations = [
  body('email').optional().trim().isEmail().withMessage('Debe proporcionar un correo valido').isLength({ max: 120 }),
  body('id_rol').optional().isInt().withMessage('El rol debe ser un entero'),
  body('estado').optional().isIn(['ACTIVO', 'INACTIVO', 'BLOQUEADO']).withMessage('Estado de usuario no valido'),
  body('tipo_documento').optional().trim().notEmpty().isLength({ max: 10 }),
  body('numero_documento').optional().trim().notEmpty().isLength({ min: 5, max: 20 }),
  body('nombres').optional().trim().notEmpty().isLength({ max: 100 }),
  body('apellidos').optional().trim().notEmpty().isLength({ max: 100 }),
  body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
  body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
];

router.get('/', authMiddleware, requireRole('coordinador'), getUsers);
router.get('/:id', authMiddleware, requireRole('coordinador'), getUserById);
router.post('/', authMiddleware, requireRole('coordinador'), createUserValidations, validateRequest, createUser);
router.put('/:id', authMiddleware, requireRole('coordinador'), updateUserValidations, validateRequest, updateUser);
router.delete('/:id', authMiddleware, requireRole('coordinador'), deleteUser);

module.exports = router;
