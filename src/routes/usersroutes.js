const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controller/userscontroller');

router.get('/', authMiddleware, requireRole('coordinador'), getUsers);
router.get('/:id', authMiddleware, requireRole('coordinador'), getUserById);
router.post('/', authMiddleware, requireRole('coordinador'), createUser);
router.put('/:id', authMiddleware, requireRole('coordinador'), updateUser);
router.delete('/:id', authMiddleware, requireRole('coordinador'), deleteUser);

module.exports = router;