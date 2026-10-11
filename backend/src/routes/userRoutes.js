const express = require('express');
const { uploadSignature } = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

const router = express.Router();

router.post('/signature', authenticate, upload.single('signature'), uploadSignature);

module.exports = router;
