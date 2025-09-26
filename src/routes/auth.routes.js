// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const nodemailer = require('nodemailer');

// Rutas de autenticación
router.post('/direct-login', authController.directLogin);
router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-code-and-login', authController.verifyCodeAndLogin);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Ruta de test para verificar configuración SMTP
router.post('/test-email', async (req, res) => {
  try {
    console.log('🧪 Iniciando test de email...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS existe:', !!process.env.EMAIL_PASS);
    
    // Crear transporter para prueba
    const testTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      secure: false,
      port: 587,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verificar conexión
    const isConnected = await testTransporter.verify();
    console.log('✅ Conexión SMTP:', isConnected);
    
    // Enviar email de prueba
    const testEmail = {
      from: `"DeliciaSoft Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviarse a sí mismo
      subject: 'Test de conexión SMTP - DeliciaSoft',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #e91e63; text-align: center;">🧪 Test de email</h2>
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p>Si recibes este email, la configuración SMTP está funcionando correctamente.</p>
            <p><strong>Hora:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Usuario:</strong> ${process.env.EMAIL_USER}</p>
            <p><strong>Servicio:</strong> Gmail SMTP</p>
            <p><strong>Puerto:</strong> 587</p>
          </div>
          <p style="text-align: center; color: #666; margin-top: 20px; font-size: 12px;">
            © 2024 DeliciaSoft - Email Test
          </p>
        </div>
      `
    };
    
    const info = await testTransporter.sendMail(testEmail);
    console.log('✅ Email de prueba enviado:', info.messageId);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });
    
  } catch (error) {
    console.error('❌ Error en test de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el test de email',
      error: error.message,
      code: error.code,
      command: error.command
    });
  }
});

// Endpoint para verificar variables de entorno
router.get('/test-config', (req, res) => {
  res.json({
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS_EXISTS: !!process.env.EMAIL_PASS,
    EMAIL_PASS_LENGTH: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0,
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
});

// Endpoint para limpiar códigos de verificación (solo para desarrollo)
router.post('/clear-codes', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    // Limpiar códigos en memoria (esto requiere acceso al controlador)
    res.json({
      success: true,
      message: 'Códigos de verificación limpiados (solo desarrollo)'
    });
  } else {
    res.status(403).json({
      success: false,
      message: 'Función no disponible en producción'
    });
  }
});

module.exports = router;