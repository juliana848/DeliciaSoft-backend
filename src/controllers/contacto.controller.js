const nodemailer = require('nodemailer');
const axios = require('axios');

// Configurar transportador de nodemailer
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificar reCAPTCHA v2
const verifyRecaptcha = async (recaptchaToken) => {
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_V2_SECRET_KEY,
        response: recaptchaToken
      }
    });
    return response.data.success;
  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error);
    return false;
  }
};

// Plantilla HTML para el correo
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

// Enviar mensaje de contacto
const enviarMensajeContacto = async (req, res) => {
  try {
    const { nombre, apellidos, correo, telefono, mensaje, recaptchaToken } = req.body;

    // Validar campos obligatorios
    if (!nombre || !apellidos || !correo || !telefono || !mensaje) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios"
      });
    }

    // Validar reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        message: "Por favor, completa la verificación reCAPTCHA"
      });
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return res.status(400).json({
        success: false,
        message: "Verificación reCAPTCHA fallida. Inténtalo de nuevo."
      });
    }

    // Configurar opciones del correo
    const mailOptions = {
      from: `"Formulario Web - Delicias Darsy" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: correo,
      subject: `🧁 Nuevo mensaje de contacto - ${nombre} ${apellidos}`,
      html: getEmailTemplate(nombre, apellidos, correo, telefono, mensaje)
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    // Enviar respuesta de confirmación al cliente
    const confirmationMailOptions = {
      from: `"Delicias Darsy" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: "✅ Mensaje recibido - Delicias Darsy",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mensaje recibido - Delicias Darsy</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #fdf2f8; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 20px rgba(236, 72, 153, 0.1); }
            .header { background: linear-gradient(135deg, #ec4899, #f97316); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; text-align: center; }
            .footer { background-color: #111827; color: #d1d5db; padding: 20px; text-align: center; font-size: 14px; }
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
                  📱 También puedes contactarnos directamente por WhatsApp: +57 321 309 85 04
                </p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                ¡Gracias por elegir Delicias Darsy! 🧁✨
              </p>
            </div>
            <div class="footer">
              <p>Delicias Darsy - Medellín, Colombia</p>
              <p>darsydelicias@gmail.com | +57 321 309 85 04</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(confirmationMailOptions);

    res.status(200).json({
      success: true,
      message: "¡Mensaje enviado con éxito! Te contactaremos pronto."
    });

  } catch (error) {
    console.error('Error enviando mensaje de contacto:', error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor. Inténtalo más tarde."
    });
  }
};

module.exports = {
  enviarMensajeContacto
};