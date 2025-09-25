const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/send-verification-code', authController.enviarCodigoVerificacion);
router.post('/verify-code-and-login', authController.verificarCodigoYLogin);
router.post('/request-password-reset', authController.solicitarRecuperacionPassword);
router.post('/reset-password', authController.cambiarPasswordConCodigo);
router.post('/direct-login', authController.loginDirecto);

module.exports = router;