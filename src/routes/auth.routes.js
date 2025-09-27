// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Rutas de autenticación
router.post('/direct-login', authController.directLogin);
router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-code-and-login', authController.verifyCodeAndLogin);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;