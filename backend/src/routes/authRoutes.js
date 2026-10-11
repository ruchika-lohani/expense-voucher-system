const express = require('express');
const { loginUser, getCurrentUser } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;
