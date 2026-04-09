const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authmiddleware');
const { me } = require('../controller/authcontroller');

router.get('/me', authMiddleware, me);

module.exports = router;