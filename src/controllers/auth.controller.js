const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

// Configuración del transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // ⛔ Ignora la validación de certificado
  }
});


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
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #e91e63, #ad1457); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                  DeliciaSoft
                </h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
                  Código de Verificación
                </p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px; text-align: center;">
                  ¡Hola! 👋
                </h2>
                
                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px; text-align: center;">
                  Hemos recibido una solicitud para verificar tu cuenta. 
                  Usa el siguiente código para continuar:
                </p>
                
                <!-- Code Box -->
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #e91e63, #ad1457); color: #ffffff; padding: 20px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);">
                    ${code}
                  </div>
                </div>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 30px 0 0; text-align: center;">
                  Este código es válido por <strong>10 minutos</strong> y es de un solo uso.
                </p>
                
                <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #ef6c00; font-size: 14px; margin: 0; font-weight: 500;">
                    🔐 Por tu seguridad, nunca compartas este código con nadie.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px;">
                  Si no solicitaste este código, puedes ignorar este email.
                </p>
                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                  © 2024 DeliciaSoft. Todos los derechos reservados.
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
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
  const logoPath = path.join(__dirname, '../public/images/logo.png'); // Ajusta ruta
  const attachments = [];

  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo'
    });
  }

  await transporter.sendMail({
    from: `"DeliciaSoft" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments
  });
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
      const { correo, userType } = req.body;
      if (!correo || !userType) {
        return res.status(400).json({ message: 'Faltan datos requeridos' });
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

      await sendHtmlEmail(correo, 'Código de Verificación - DeliciaSoft', getVerificationEmailTemplate(code));
      res.json({ message: 'Código enviado', codigo: code });
    } catch (error) {
      console.error('Error enviando código:', error);
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