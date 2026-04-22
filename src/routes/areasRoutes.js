const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const { getAreas } = require('../controller/areasController');

router.get('/', authMiddleware, getAreas);

module.exports = router;
