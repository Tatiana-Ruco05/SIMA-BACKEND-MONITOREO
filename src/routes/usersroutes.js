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
router.get('/:id', authMiddleware, getUserById);
router.post('/', authMiddleware, requireRole('coordinador'), createUser);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, requireRole('coordinador'), deleteUser);

module.exports = router;