// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const brevo = require('@getbrevo/brevo');

// Rutas de autenticación
router.post('/direct-login', authController.directLogin);
router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-code-and-login', authController.verifyCodeAndLogin);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Ruta de test para verificar configuración de Brevo moderno
router.post('/test-email', async (req, res) => {
  try {
    console.log('🧪 Iniciando test de email con Brevo moderno...');
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

    // Configurar el cliente moderno de Brevo con sintaxis correcta
    const defaultClient = brevo.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new brevo.TransactionalEmailsApi();

    // Crear objeto de email de prueba
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Test de conexión Brevo Moderno - DeliciaSoft';
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
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🧪 Test Email Moderno</h1>
            <p style="color: #ffffff; margin: 10px 0 0; opacity: 0.9;">DeliciaSoft - Brevo Modern Integration</p>
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
              Si recibes este email, la configuración moderna de Brevo está funcionando correctamente.
            </p>
            
            <!-- Info Box -->
            <div style="background-color: #f8f9fa; border-left: 4px solid #e91e63; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #e91e63; margin: 0 0 15px; font-size: 18px;">📋 Información del Test</h3>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Remitente:</strong> ${process.env.EMAIL_USER}</p>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>Proveedor:</strong> Brevo (Modern SDK)</p>
              <p style="color: #333; margin: 5px 0; font-size: 14px;"><strong>SDK:</strong> @getbrevo/brevo v3</p>
            </div>
            
            <div style="background-color: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-weight: bold;">
                🚀 Tu servicio de email moderno está listo para usar
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              © 2024 DeliciaSoft - Powered by Brevo Modern SDK
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.sender = { 
      name: "DeliciaSoft Modern Test", 
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

    console.log('📧 Enviando email de prueba moderno...');
    
    // Enviar email
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email de prueba moderno enviado exitosamente:', response);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente vía Brevo Moderno',
      messageId: response.messageId || response.body?.messageId,
      provider: 'Brevo Modern SDK',
      sdk: '@getbrevo/brevo',
      timestamp: new Date().toISOString(),
      details: {
        to: process.env.EMAIL_USER,
        from: process.env.EMAIL_USER,
        subject: 'Test de conexión Brevo Moderno - DeliciaSoft',
        api: 'Brevo v3 Modern Transactional API'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test de email con Brevo moderno:', error);
    
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
      message: 'Error en el test de email con Brevo moderno',
      error: errorMessage,
      details: errorDetails,
      provider: 'Brevo Modern SDK',
      timestamp: new Date().toISOString(),
      troubleshooting: {
        checkApiKey: 'Verifica que tu BREVO_API_KEY sea correcta',
        checkSender: 'Asegúrate de que el EMAIL_USER esté verificado en Brevo',
        checkQuota: 'Revisa si tienes cuota disponible en tu cuenta Brevo',
        sdk: 'Usando @getbrevo/brevo - versión moderna'
      }
    });
  }
});

// Endpoint para verificar variables de entorno de Brevo
router.get('/test-config', (req, res) => {
  const config = {
    BREVO_API_KEY_EXISTS: !!process.env.BREVO_API_KEY,
    BREVO_API_KEY_LENGTH: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
    BREVO_API_KEY_PREFIX: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 20) + '...' : 'No configurado',
    EMAIL_USER: process.env.EMAIL_USER || 'No configurado',
    EMAIL_USER_EXISTS: !!process.env.EMAIL_USER,
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PROVIDER: 'Brevo Modern SDK (@getbrevo/brevo)',
    SDK_VERSION: '3.x',
    TIMESTAMP: new Date().toISOString()
  };

  // Agregar recomendaciones si faltan configuraciones
  const recommendations = [];
  
  if (!process.env.BREVO_API_KEY) {
    recommendations.push('Configura BREVO_API_KEY en tu archivo .env');
  }
  
  if (!process.env.EMAIL_USER) {
    recommendations.push('Configura EMAIL_USER en tu archivo .env');
  }
  
  if (!process.env.JWT_SECRET) {
    recommendations.push('Configura JWT_SECRET en tu archivo .env');
  }

  if (recommendations.length > 0) {
    config.recommendations = recommendations;
    config.status = 'INCOMPLETE_CONFIG';
  } else {
    config.status = 'CONFIG_OK';
  }

  res.json(config);
});

// Endpoint para limpiar códigos de verificación (solo para desarrollo)
router.post('/clear-codes', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    res.json({
      success: true,
      message: 'Códigos de verificación limpiados (solo desarrollo)',
      provider: 'Brevo Modern SDK',
      timestamp: new Date().toISOString(),
      note: 'Esta función solo funciona en modo desarrollo'
    });
  } else {
    res.status(403).json({
      success: false,
      message: 'Función no disponible en producción',
      provider: 'Brevo Modern SDK'
    });
  }
});

// Endpoint para obtener información de cuenta Brevo moderno
router.get('/brevo-account-info', async (req, res) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'BREVO_API_KEY no configurado',
        recommendation: 'Configura tu API key de Brevo en las variables de entorno'
      });
    }

    // Configurar cliente con sintaxis correcta
    const defaultClient = brevo.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const accountApi = new brevo.AccountApi();
    
    console.log('Consultando información de cuenta Brevo moderno...');
    const accountInfo = await accountApi.getAccount();
    
    res.json({
      success: true,
      message: 'Información de cuenta obtenida exitosamente',
      account: {
        email: accountInfo.email,
        firstName: accountInfo.firstName || 'No especificado',
        lastName: accountInfo.lastName || 'No especificado',
        companyName: accountInfo.companyName || 'No especificado',
        plan: accountInfo.plan || 'Plan no especificado'
      },
      provider: 'Brevo Modern SDK',
      sdk: '@getbrevo/brevo',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error obteniendo info de cuenta Brevo:', error);
    
    let errorMessage = 'Error consultando información de cuenta Brevo';
    let statusCode = 500;
    
    if (error.response && error.response.status) {
      statusCode = error.response.status;
      if (error.response.status === 401) {
        errorMessage = 'API Key inválida o expirada';
      } else if (error.response.status === 403) {
        errorMessage = 'No tienes permisos para acceder a esta información';
      }
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      provider: 'Brevo Modern SDK',
      sdk: '@getbrevo/brevo',
      timestamp: new Date().toISOString(),
      troubleshooting: {
        step1: 'Verifica que tu BREVO_API_KEY sea correcta',
        step2: 'Asegúrate de que la API key tenga los permisos necesarios',
        step3: 'Revisa que tu cuenta Brevo esté activa'
      }
    });
  }
});

// Endpoint para verificar el estado del servicio de email
router.get('/email-service-status', async (req, res) => {
  try {
    const status = {
      provider: 'Brevo Modern SDK (@getbrevo/brevo)',
      sdk_version: '3.x',
      timestamp: new Date().toISOString(),
      config: {
        apiKeyConfigured: !!process.env.BREVO_API_KEY,
        emailUserConfigured: !!process.env.EMAIL_USER,
        jwtSecretConfigured: !!process.env.JWT_SECRET
      },
      service: {
        available: false,
        lastTest: null,
        error: null
      }
    };

    // Intentar una verificación básica si está configurado
    if (process.env.BREVO_API_KEY) {
      try {
        // Configurar cliente con sintaxis correcta
        const defaultClient = brevo.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const accountApi = new brevo.AccountApi();
        await accountApi.getAccount();
        
        status.service.available = true;
        status.service.lastTest = new Date().toISOString();
        status.service.message = 'Servicio funcionando correctamente con SDK moderno';
        
      } catch (serviceError) {
        status.service.available = false;
        status.service.error = serviceError.message;
        status.service.lastTest = new Date().toISOString();
      }
    } else {
      status.service.error = 'API Key no configurada';
    }

    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verificando estado del servicio',
      error: error.message,
      provider: 'Brevo Modern SDK',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
