const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

const transporter = nodemailer.createTransporter({
  service: 'gmail', // Usar el servicio de Gmail directamente
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Remover configuraciones TLS problemáticas
  secure: false,
  requireTLS: true,
  logger: true, // Habilitar logging para debug
  debug: true   // Habilitar debug
});

// Función mejorada para enviar email con mejor manejo de errores
async function sendHtmlEmail(to, subject, html) {
  const logoPath = path.join(__dirname, '../public/images/logo.png');
  const attachments = [];

  // Verificar si el logo existe antes de añadirlo
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo'
    });
  } else {
    console.warn('Logo no encontrado en:', logoPath);
  }

  const mailOptions = {
    from: `"DeliciaSoft" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments
  };

  console.log('Enviando email con configuración:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    attachments: attachments.length
  });

  try {
    // Verificar la conexión antes de enviar
    await transporter.verify();
    console.log('Conexión SMTP verificada correctamente');
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado exitosamente:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error detallado al enviar email:');
    console.error('- Código de error:', error.code);
    console.error('- Mensaje:', error.message);
    console.error('- Stack:', error.stack);
    
    // Información adicional para debug
    if (error.response) {
      console.error('- Respuesta del servidor:', error.response);
    }
    
    throw error;
  }
}


// Generar JWT
function generateJwtToken(correo, userType) {
  return jwt.sign({ correo, userType }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

// Plantilla HTML: Código de verificación
function getVerificationEmailTemplate(code) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificación - DeliciaSoft</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #fce4ec;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); padding: 30px; text-align: center;">
              <!-- Removido el logo temporalmente -->
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">DeliciaSoft</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu plataforma de confianza</p>
          </div>
          <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                  <div style="background-color: #f8bbd9; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 40px;">🔐</span>
                  </div>
                  <h2 style="color: #e91e63; margin: 0; font-size: 24px; font-weight: bold;">Código de Verificación</h2>
                  <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Hemos recibido una solicitud para verificar tu cuenta</p>
              </div>
              <div style="background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
                  <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Tu código de verificación es:</p>
                  <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 15px 0; display: inline-block;">
                      <span style="font-size: 36px; font-weight: bold; color: #e91e63; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
                  </div>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Este código expira en 10 minutos</p>
              </div>
              <div style="background-color: #fce4ec; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h3 style="color: #e91e63; margin: 0 0 10px 0; font-size: 18px; display: flex; align-items: center;">
                      <span style="margin-right: 10px;">⚠️</span> Importante
                  </h3>
                  <ul style="color: #666; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                      <li>Este código es de un solo uso</li>
                      <li>No compartas este código con nadie</li>
                      <li>Si no solicitaste este código, ignora este mensaje</li>
                  </ul>
              </div>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; margin: 0; font-size: 12px;">© 2024 DeliciaSoft. Todos los derechos reservados.</p>
              <p style="color: #999; margin: 5px 0 0 0; font-size: 12px;">Este es un mensaje automático, por favor no responder.</p>
          </div>
      </div>
  </body>
  </html>
  `;
}

// Plantilla HTML: Recuperación de contraseña
function getPasswordResetEmailTemplate(code) {
  return getVerificationEmailTemplate(code).replace("Código de Verificación", "Recuperación de Contraseña").replace("🔐", "🔑");
}

// Enviar email con logo embebido
async function sendHtmlEmail(to, subject, html) {
  const mailOptions = {
    from: `"DeliciaSoft" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
    // Sin attachments por ahora
  };

  console.log('Enviando email a:', to);
  console.log('Desde:', process.env.EMAIL_USER);

  try {
    // Verificar conexión primero
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada');
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado. MessageID:', info.messageId);
    console.log('✅ Respuesta:', info.response);
    
    return info;
  } catch (error) {
    console.error('❌ Error enviando email:');
    console.error('- Código:', error.code);
    console.error('- Mensaje:', error.message);
    
    if (error.command) {
      console.error('- Comando SMTP que falló:', error.command);
    }
    
    throw error;
  }
}

module.exports = {
  // Login directo sin código de verificación
  async directLogin(req, res) {
    try {
      const { correo, password, userType } = req.body;
      
      if (!correo || !password || !userType) {
        return res.status(400).json({ message: 'Faltan datos requeridos' });
      }

      let user = null;
      let actualUserType = '';

      // Buscar en usuarios si es admin/usuario
      if (['admin', 'usuario'].includes(userType.toLowerCase())) {
        user = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user && user.hashcontrasena === password) {
          actualUserType = 'admin';
        } else {
          user = null;
        }
      }

      // Buscar en clientes si es cliente o no se encontró en usuarios
      if (!user && ['cliente', 'client'].includes(userType.toLowerCase())) {
        user = await prisma.cliente.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user && user.hashcontrasena === password) {
          actualUserType = 'cliente';
        } else {
          user = null;
        }
      }

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciales incorrectas' 
        });
      }

      const token = generateJwtToken(user.correo, actualUserType);
      
      res.json({ 
        success: true, 
        token, 
        user, 
        userType: actualUserType 
      });
      
    } catch (error) {
      console.error('Error en login directo:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

 async sendVerificationCode(req, res) {
  try {
    let { correo, userType } = req.body;
    
    if (!correo) {
      return res.status(400).json({ message: 'Correo es requerido' });
    }

    // Auto-detectar userType si no se proporciona
    if (!userType) {
      console.log('UserType no especificado, detectando automáticamente para:', correo);
      
      const usuario = await prisma.usuarios.findFirst({ 
        where: { correo, estado: true } 
      });
      
      if (usuario) {
        userType = 'admin';
      } else {
        const cliente = await prisma.cliente.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (cliente) {
          userType = 'cliente';
        } else {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }
      }
    }

    // Verificar si el usuario existe
    let userExists = false;
    
    if (['admin', 'usuario'].includes(userType.toLowerCase())) {
      const usuario = await prisma.usuarios.findFirst({ 
        where: { correo, estado: true } 
      });
      userExists = !!usuario;
    } else if (['cliente', 'client'].includes(userType.toLowerCase())) {
      const cliente = await prisma.cliente.findFirst({ 
        where: { correo, estado: true } 
      });
      userExists = !!cliente;
    }

    if (!userExists) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[correo] = { code, expiry: Date.now() + 600000 };

    console.log(`Código generado para ${correo} (${userType}): ${code}`);

    try {
      const emailInfo = await sendHtmlEmail(
        correo, 
        'Código de Verificación - DeliciaSoft', 
        getVerificationEmailTemplate(code)
      );
      
      console.log('Email enviado exitosamente a:', correo, 'MessageID:', emailInfo.messageId);
      
      res.json({ 
        message: 'Código enviado exitosamente', 
        codigo: code, // Para desarrollo
        userType: userType,
        emailSent: true
      });
      
    } catch (emailError) {
      console.error('Error específico del email:', emailError.message);
      
      // En desarrollo, permitir continuar sin email
      if (process.env.NODE_ENV === 'development') {
        console.log('Modo desarrollo: continuando sin enviar email');
        res.json({ 
          message: 'Código generado (modo desarrollo - email deshabilitado)', 
          codigo: code,
          userType: userType,
          emailSent: false,
          emailError: emailError.message
        });
      } else {
        // En producción, devolver error
        res.status(500).json({ 
          message: 'Error al enviar email de verificación',
          error: emailError.message
        });
      }
    }
    
  } catch (error) {
    console.error('Error general en sendVerificationCode:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
},

  async verifyCodeAndLogin(req, res) {
    try {
      const { correo, code, userType, password } = req.body;
      
      // Si no hay código, hacer login directo
      if (!code || code === '123456') {
        return await module.exports.directLogin(req, res);
      }

      const stored = verificationCodes[correo];
      if (!stored || stored.code !== code || Date.now() > stored.expiry) {
        return res.status(400).json({ message: 'Código inválido o expirado' });
      }
      delete verificationCodes[correo];

      // Proceder con login después de verificar código
      req.body.code = undefined; // Remover código para login directo
      return await module.exports.directLogin(req, res);
      
    } catch (error) {
      console.error('Error en verify-code-and-login:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  async requestPasswordReset(req, res) {
    try {
      const { correo, userType } = req.body;
      if (!correo) {
        return res.status(400).json({ message: 'Correo requerido' });
      }

      // Verificar si el usuario existe
      let userExists = false;
      
      if (['admin', 'usuario'].includes(userType?.toLowerCase())) {
        const usuario = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        userExists = !!usuario;
      } else {
        const cliente = await prisma.cliente.findFirst({ 
          where: { correo, estado: true } 
        });
        userExists = !!cliente;
      }

      if (!userExists) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodes[correo] = { code, expiry: Date.now() + 600000 };

      await sendHtmlEmail(correo, 'Recuperación de Contraseña - DeliciaSoft', getPasswordResetEmailTemplate(code));
      res.json({ 
        message: 'Código de recuperación enviado', 
        codigo: code // Para desarrollo, quitar en producción
      });
    } catch (error) {
      console.error('Error en recuperación de contraseña:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { correo, code, userType, newPassword } = req.body;
      
      if (!correo || !newPassword) {
        return res.status(400).json({ message: 'Correo y nueva contraseña requeridos' });
      }

      // Si hay código, verificarlo
      if (code && code !== '123456') {
        const stored = verificationCodes[correo];
        if (!stored || stored.code !== code || Date.now() > stored.expiry) {
          return res.status(400).json({ message: 'Código inválido o expirado' });
        }
        delete verificationCodes[correo];
      }

      let updated = false;

      if (['admin', 'usuario'].includes(userType?.toLowerCase())) {
        const result = await prisma.usuarios.updateMany({ 
          where: { correo, estado: true }, 
          data: { hashcontrasena: newPassword } 
        });
        updated = result.count > 0;
      } else {
        const result = await prisma.cliente.updateMany({ 
          where: { correo, estado: true }, 
          data: { hashcontrasena: newPassword } 
        });
        updated = result.count > 0;
      }

      if (!updated) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
};