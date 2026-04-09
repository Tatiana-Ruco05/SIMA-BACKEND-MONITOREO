const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { requireRole } = require('../middlewares/permissionsmiddleware');
const { getApprentices } = require('../controller/apprenticescontroller');

router.get('/', authMiddleware, requireRole('coordinador', 'instructor'), getApprentices);

module.exports = router;