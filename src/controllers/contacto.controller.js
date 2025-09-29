const axios = require('axios');
// Cambiar de nodemailer a Brevo usando sib-api-v3-sdk (más estable)
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configuración con BREVO usando sib-api-v3-sdk
let transactionalEmailsApi = null;

function initializeBrevoClient() {
  try {
    console.log('📧 Inicializando cliente de Brevo para contacto...');
    console.log('BREVO_API_KEY existe:', !!process.env.BREVO_API_KEY);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);

    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
      console.error('❌ BREVO_API_KEY o EMAIL_USER no están configurados');
      return null;
    }

    // Configurar cliente con sib-api-v3-sdk (funciona garantizado)
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    // Crear instancia del API transaccional
    transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();

    console.log('✅ Cliente Brevo inicializado correctamente para contacto');
    return transactionalEmailsApi;

  } catch (error) {
    console.error('❌ Error inicializando cliente Brevo para contacto:', error.message);
    return null;
  }
}

// Inicializar al cargar el módulo
initializeBrevoClient();

// Función para enviar email con Brevo
async function sendBrevoEmail(to, subject, htmlContent, replyTo = null) {
  if (!transactionalEmailsApi) {
    console.log('⚠️ Cliente Brevo no disponible, reinicializando...');
    initializeBrevoClient();
  }

  if (!transactionalEmailsApi) {
    throw new Error('No se pudo configurar el servicio de email Brevo');
  }

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = { 
    name: "Delicias Darsy", 
    email: process.env.EMAIL_USER 
  };
  sendSmtpEmail.to = [{ email: to }];
  
  if (replyTo) {
    sendSmtpEmail.replyTo = { 
      name: replyTo.name || "Cliente", 
      email: replyTo.email 
    };
  }

  console.log('📧 Enviando email a través de Brevo:', to);
  
  try {
    const response = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Email enviado exitosamente vía Brevo:', response.messageId);
    return response;
    
  } catch (error) {
    console.error('❌ Error enviando email con Brevo:', error);
    
    // Log más detallado del error
    if (error.response && error.response.body) {
      console.error('Error details:', error.response.body);
    }
    
    throw new Error(`Error Brevo: ${error.message}`);
  }
}

// Verificar reCAPTCHA v2
const verifyRecaptcha = async (recaptchaToken) => {
  try {
    console.log('Verificando reCAPTCHA con Google...');
    console.log('Secret key presente:', !!process.env.RECAPTCHA_V2_SECRET_KEY);
    
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_V2_SECRET_KEY,
        response: recaptchaToken
      },
      timeout: 10000
    });
    
    console.log('Respuesta de Google reCAPTCHA:', response.data);
    return response.data.success;
  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error.message);
    return false;
  }
};

// Plantilla HTML para el correo principal (el que llega al negocio)
const getEmailTemplate = (nombre, apellidos, correo, telefono, mensaje) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo mensaje de contacto - Delicias Darsy</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          background-color: #fdf2f8;
          color: #374151;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(236, 72, 153, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #ec4899 0%, #f97316 100%);
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="white" stop-opacity="0.1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="100" height="20" fill="url(%23a)"/></svg>');
          opacity: 0.3;
        }
        .header h1 {
          color: white;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          position: relative;
          z-index: 1;
        }
        .header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          position: relative;
          z-index: 1;
        }
        .content {
          padding: 40px 30px;
        }
        .message-info {
          background-color: #fef3c7;
          border-left: 5px solid #fbbf24;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 10px;
        }
        .info-grid {
          display: grid;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-item {
          display: flex;
          align-items: center;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        .info-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ec4899, #f97316);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .info-content {
          flex: 1;
        }
        .info-label {
          font-weight: bold;
          color: #374151;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .info-value {
          color: #6b7280;
          font-size: 16px;
        }
        .message-content {
          background-color: #f8fafc;
          padding: 25px;
          border-radius: 15px;
          border: 2px solid #e2e8f0;
          margin: 20px 0;
        }
        .message-text {
          color: #374151;
          font-size: 16px;
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .footer {
          background-color: #111827;
          color: white;
          padding: 30px;
          text-align: center;
        }
        .footer h3 {
          color: #ec4899;
          margin-bottom: 15px;
          font-size: 20px;
        }
        .footer p {
          color: #d1d5db;
          margin-bottom: 5px;
        }
        .timestamp {
          background-color: #e0f2fe;
          color: #0f172a;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
          margin-top: 20px;
        }
        .brevo-badge {
          background-color: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 20px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧁 Delicias Darsy</h1>
          <p>Nuevo mensaje de contacto recibido</p>
        </div>
        
        <div class="content">
          <div class="message-info">
            <h3 style="color: #92400e; margin-bottom: 10px;">📬 ¡Tienes un nuevo mensaje!</h3>
            <p style="color: #92400e; margin: 0;">Un cliente se ha puesto en contacto contigo a través del formulario web.</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-icon">
                <span style="color: white; font-size: 18px;">👤</span>
              </div>
              <div class="info-content">
                <div class="info-label">Nombre completo</div>
                <div class="info-value">${nombre} ${apellidos}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <span style="color: white; font-size: 18px;">✉️</span>
              </div>
              <div class="info-content">
                <div class="info-label">Correo electrónico</div>
                <div class="info-value">${correo}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <span style="color: white; font-size: 18px;">📱</span>
              </div>
              <div class="info-content">
                <div class="info-label">Teléfono</div>
                <div class="info-value">${telefono}</div>
              </div>
            </div>
          </div>

          <h3 style="color: #374151; margin-bottom: 15px;">💬 Mensaje:</h3>
          <div class="message-content">
            <div class="message-text">${mensaje}</div>
          </div>

          <div class="timestamp">
            <strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Bogota'
            })}
          </div>
          
          <div class="brevo-badge">
            <small style="color: #0ea5e9; font-weight: bold;">📧 Enviado vía Brevo (sib-api-v3-sdk)</small>
          </div>
        </div>

        <div class="footer">
          <h3>Delicias Darsy 🧁</h3>
          <p>📱 +57 321 309 85 04</p>
          <p>📧 darsydelicias@gmail.com</p>
          <p>📍 Medellín, Colombia</p>
          <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
            Este mensaje fue enviado automáticamente desde el formulario de contacto de tu sitio web.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Plantilla HTML para el email de confirmación al cliente
const getConfirmationTemplate = (nombre) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mensaje recibido - Delicias Darsy</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background-color: #fdf2f8; 
          margin: 0; 
          padding: 20px; 
        }
        .container { 
          max-width: 500px; 
          margin: 0 auto; 
          background-color: white; 
          border-radius: 15px; 
          overflow: hidden; 
          box-shadow: 0 8px 20px rgba(236, 72, 153, 0.1); 
        }
        .header { 
          background: linear-gradient(135deg, #ec4899, #f97316); 
          padding: 30px; 
          text-align: center; 
          color: white; 
        }
        .content { 
          padding: 30px; 
          text-align: center; 
        }
        .footer { 
          background-color: #111827; 
          color: #d1d5db; 
          padding: 20px; 
          text-align: center; 
          font-size: 14px; 
        }
        .whatsapp-button {
          display: inline-block;
          background-color: #25d366;
          color: white !important;
          padding: 12px 25px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
          margin: 15px 0;
          transition: background-color 0.3s ease;
        }
        .whatsapp-button:hover {
          background-color: #128c7e;
        }
        .brevo-badge {
          background-color: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 15px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧁 Delicias Darsy</h1>
          <p>¡Gracias por contactarnos!</p>
        </div>
        <div class="content">
          <h2 style="color: #ec4899; margin-bottom: 20px;">Hola ${nombre},</h2>
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            Hemos recibido tu mensaje y nos pondremos en contacto contigo muy pronto. 
            Nuestro equipo revisará tu consulta y te responderá a la brevedad posible.
          </p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">
              📱 También puedes contactarnos directamente por WhatsApp
            </p>
            <a href="https://wa.me/573213098504?text=¡Hola!%20Me%20gustaría%20obtener%20más%20información%20sobre%20sus%20productos%20🧁" 
               class="whatsapp-button" target="_blank" rel="noopener noreferrer">
              💬 Escribir por WhatsApp
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            ¡Gracias por elegir Delicias Darsy! 🧁✨
          </p>
          <div class="brevo-badge">
            <small style="color: #0ea5e9; font-weight: bold;">📧 Enviado vía Brevo</small>
          </div>
        </div>
        <div class="footer">
          <p><strong>Delicias Darsy</strong> - Medellín, Colombia</p>
          <p>darsydelicias@gmail.com | +57 321 309 85 04</p>
          <p style="margin-top: 10px; font-size: 12px; opacity: 0.8;">
            Powered by Brevo Email Service
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Enviar mensaje de contacto usando Brevo
const enviarMensajeContacto = async (req, res) => {
  try {
    console.log('=== INICIO PROCESO CONTACTO CON BREVO ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Variables de entorno:');
    console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Configurado' : 'NO CONFIGURADO');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Configurado' : 'NO CONFIGURADO');
    console.log('RECAPTCHA_V2_SECRET_KEY:', process.env.RECAPTCHA_V2_SECRET_KEY ? 'Configurado' : 'NO CONFIGURADO');
    
    const { nombre, apellidos, correo, telefono, mensaje, recaptchaToken } = req.body;

    console.log('Datos recibidos:', {
      nombre,
      apellidos,
      correo,
      telefono,
      mensajeLength: mensaje ? mensaje.length : 0,
      tokenLength: recaptchaToken ? recaptchaToken.length : 0
    });

    // Validar campos obligatorios
    if (!nombre || !apellidos || !correo || !telefono || !mensaje) {
      console.log('ERROR: Campos faltantes');
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios"
      });
    }

    // Validar reCAPTCHA
    if (!recaptchaToken) {
      console.log('ERROR: Token reCAPTCHA faltante');
      return res.status(400).json({
        success: false,
        message: "Por favor, completa la verificación reCAPTCHA"
      });
    }

    console.log('Iniciando verificación reCAPTCHA...');
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    console.log('Resultado reCAPTCHA:', isRecaptchaValid);
    
    if (!isRecaptchaValid) {
      console.log('ERROR: reCAPTCHA inválido');
      return res.status(400).json({
        success: false,
        message: "Verificación reCAPTCHA fallida. Inténtalo de nuevo."
      });
    }

    console.log('reCAPTCHA válido, preparando envío de emails con Brevo...');

    // Verificar que Brevo esté configurado
    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
      console.error('ERROR: Variables de entorno de Brevo no configuradas');
      return res.status(500).json({
        success: false,
        message: "Error de configuración del servidor de emails"
      });
    }

    let emailsPrincipalEnviado = false;
    let emailConfirmacionEnviado = false;

    // 1. Enviar email principal al negocio con Brevo
    try {
      console.log('📧 Enviando correo principal con Brevo...');
      
      await sendBrevoEmail(
        process.env.EMAIL_USER,
        `🧁 Nuevo mensaje de contacto - ${nombre} ${apellidos}`,
        getEmailTemplate(nombre, apellidos, correo, telefono, mensaje),
        { name: `${nombre} ${apellidos}`, email: correo }
      );
      
      console.log('✅ Correo principal enviado exitosamente con Brevo');
      emailsPrincipalEnviado = true;
      
    } catch (emailError) {
      console.error('❌ ERROR enviando correo principal con Brevo:');
      console.error('Mensaje:', emailError.message);
      throw emailError;
    }

    // 2. Enviar email de confirmación al cliente con Brevo
    try {
      console.log('📧 Enviando email de confirmación con Brevo...');
      
      await sendBrevoEmail(
        correo,
        "✅ Mensaje recibido - Delicias Darsy",
        getConfirmationTemplate(nombre)
      );
      
      console.log('✅ Email de confirmación enviado exitosamente con Brevo');
      emailConfirmacionEnviado = true;
      
    } catch (confirmationError) {
      console.error('❌ ERROR enviando email de confirmación con Brevo:', confirmationError.message);
      // No lanzamos error aquí porque el email principal ya se envió
    }

    console.log('=== PROCESO COMPLETADO EXITOSAMENTE CON BREVO ===');
    console.log('Status:', {
      emailPrincipal: emailsPrincipalEnviado,
      emailConfirmacion: emailConfirmacionEnviado,
      proveedor: 'Brevo (sib-api-v3-sdk)',
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: "¡Mensaje enviado con éxito! Te contactaremos pronto.",
      details: {
        emailPrincipalEnviado: emailsPrincipalEnviado,
        emailConfirmacionEnviado: emailConfirmacionEnviado,
        proveedor: "Brevo",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('=== ERROR GENERAL EN CONTACTO CON BREVO ===');
    console.error('Error enviando mensaje de contacto:', error.message);
    console.error('Stack completo:', error.stack);
    
    res.status(500).json({
      success: false,
      message: "Error interno del servidor. Inténtalo más tarde.",
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      proveedor: "Brevo",
      timestamp: new Date().toISOString()
    });
  }
};

// Endpoint de prueba para verificar configuración de Brevo en contacto
const testBrevoContacto = async (req, res) => {
  try {
    console.log('🧪 Iniciando test de Brevo para contacto...');
    
    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
      return res.status(500).json({
        success: false,
        message: 'BREVO_API_KEY o EMAIL_USER no configurados para contacto',
        config: {
          BREVO_API_KEY_EXISTS: !!process.env.BREVO_API_KEY,
          EMAIL_USER_EXISTS: !!process.env.EMAIL_USER
        }
      });
    }

    // Enviar email de prueba usando la función de contacto
    await sendBrevoEmail(
      process.env.EMAIL_USER,
      '🧪 Test de Contacto - Brevo Integration',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #ec4899, #f97316); color: white; padding: 20px; text-align: center; border-radius: 10px;">
            <h1>🧪 Test de Contacto</h1>
            <p>Sistema de contacto con Brevo funcionando</p>
          </div>
          <div style="background: white; padding: 20px; margin-top: 20px; border-radius: 10px;">
            <h2>✅ Configuración Exitosa</h2>
            <p>El sistema de contacto ahora está integrado con Brevo (sib-api-v3-sdk)</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Provider:</strong> Brevo Email Service</p>
          </div>
        </div>
      `
    );

    res.json({
      success: true,
      message: 'Test de contacto con Brevo exitoso',
      provider: 'Brevo (sib-api-v3-sdk)',
      timestamp: new Date().toISOString(),
      config: {
        brevo_configured: true,
        email_user_configured: true
      }
    });

  } catch (error) {
    console.error('❌ Error en test de contacto con Brevo:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error en test de contacto con Brevo',
      error: error.message,
      provider: 'Brevo (sib-api-v3-sdk)',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  enviarMensajeContacto,
  testBrevoContacto
};