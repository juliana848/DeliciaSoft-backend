// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Rutas de autenticación
router.post('/direct-login', authController.directLogin);
router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-code-and-login', authController.verifyCodeAndLogin);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Ruta de test para verificar configuración de Brevo
router.post('/test-email', async (req, res) => {
  try {
    console.log('🧪 Iniciando test de email con Brevo...');
    console.log('BREVO_API_KEY existe:', !!process.env.BREVO_API_KEY);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    
    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
      return res.status(500).json({
        success: false,
        message: 'BREVO_API_KEY o EMAIL_USER no configurados',
        config: {
          BREVO_API_KEY_EXISTS: !!process.env.BREVO_API_KEY,
          EMAIL_USER_EXISTS: !!process.env.EMAIL_USER
        }
      });
    }

    // Configurar el cliente de Brevo
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    // Crear instancia del cliente de email transaccional
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Crear objeto de email de prueba
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Test de conexión Brevo - DeliciaSoft';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email - DeliciaSoft</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #e91e63, #ad1457); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🧪 Test Email</h1>
            <p style="color: #ffffff; margin: 10px 0 0; opacity: 0.9;">DeliciaSoft - Brevo Integration</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #4caf50, #2e7d32); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 40px;">✅</span>
              </div>
              <h2 style="color: #333; margin: 0; font-size: 24px;">¡Conexión Exitosa!</h2>
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 30px;">
              Si recibes este email, la configuración de Brevo está funcionando correctamente.
            </p>
            
            <!-- Info Box -->
            <div style="background-color: #f8f9fa; border-left: 4px solid #e91e63; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #e91e63; margin: 0 0 15px; font-size: 18px;">📋 Información del Test</h3>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Remitente:</strong> ${process.env.EMAIL_USER}</p>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Proveedor:</strong> Brevo (Sendinblue)</p>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>API:</strong> Brevo v3</p>
            </div>
            
            <div style="background-color: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-weight: bold;">
                🚀 Tu servicio de email está listo para usar
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              © 2024 DeliciaSoft - Powered by Brevo
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.sender = { 
      name: "DeliciaSoft Test", 
      email: process.env.EMAIL_USER 
    };
    
    sendSmtpEmail.to = [{ 
      email: process.env.EMAIL_USER, 
      name: "Test Recipient" 
    }];
    
    sendSmtpEmail.replyTo = { 
      name: "DeliciaSoft", 
      email: process.env.EMAIL_USER 
    };

    console.log('📧 Enviando email de prueba...');
    
    // Enviar email
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email de prueba enviado exitosamente:', response);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente vía Brevo',
      messageId: response.messageId,
      provider: 'Brevo',
      timestamp: new Date().toISOString(),
      details: {
        to: process.env.EMAIL_USER,
        from: process.env.EMAIL_USER,
        subject: 'Test de conexión Brevo - DeliciaSoft',
        api: 'Brevo v3 Transactional API'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test de email con Brevo:', error);
    
    let errorMessage = 'Error desconocido';
    let errorDetails = {};
    
    if (error.response && error.response.body) {
      errorMessage = error.response.body.message || error.message;
      errorDetails = {
        status: error.response.status,
        statusText: error.response.statusText,
        body: error.response.body
      };
    } else {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error en el test de email con Brevo',
      error: errorMessage,
      details: errorDetails,
      provider: 'Brevo',
      timestamp: new Date().toISOString()
    });
  }
});

// Exportar router
module.exports = router;
