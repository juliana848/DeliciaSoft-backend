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

router.post('/test-email', async (req, res) => {
  try {
    console.log('🧪 Iniciando test de email...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS existe:', !!process.env.EMAIL_PASS);
    
    // Verificar conexión
    const isConnected = await transporter.verify();
    console.log('✅ Conexión SMTP:', isConnected);
    
    // Enviar email de prueba
    const testEmail = {
      from: `"DeliciaSoft Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviarse a sí mismo
      subject: 'Test de conexión SMTP - DeliciaSoft',
      html: `
        <h2>Test de email</h2>
        <p>Si recibes este email, la configuración SMTP está funcionando correctamente.</p>
        <p>Hora: ${new Date().toLocaleString()}</p>
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Email de prueba enviado:', info.messageId);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      messageId: info.messageId,
      response: info.response
    });
    
  } catch (error) {
    console.error('❌ Error en test de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el test de email',
      error: error.message,
      code: error.code
    });
  }
});

// También añadir un endpoint para verificar variables de entorno
router.get('/test-config', (req, res) => {
  res.json({
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS_EXISTS: !!process.env.EMAIL_PASS,
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV
  });
});

module.exports = router;