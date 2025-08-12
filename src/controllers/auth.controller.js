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
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #fce4ec;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); padding: 30px; text-align: center;">
              <img src="cid:logo" alt="DeliciaSoft Logo" style="max-width: 120px; height: auto; margin-bottom: 15px;">
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
                      <span style="margin-right: 10px;">⚠</span> Importante
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
  async sendVerificationCode(req, res) {
    const { correo, userType } = req.body;
    if (!correo || !userType) return res.status(400).json({ message: 'Faltan datos requeridos' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[correo] = { code, expiry: Date.now() + 600000 };

    await sendHtmlEmail(correo, 'Código de Verificación - DeliciaSoft', getVerificationEmailTemplate(code));
    res.json({ message: 'Código enviado', codigo: code });
  },

  async verifyCodeAndLogin(req, res) {
    const { correo, code, userType, password } = req.body;
    const stored = verificationCodes[correo];
    if (!stored || stored.code !== code || Date.now() > stored.expiry) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }
    delete verificationCodes[correo];

    if (['admin', 'usuario'].includes(userType.toLowerCase())) {
      const usuario = await prisma.usuario.findFirst({ where: { correo, estado: true } });
      if (!usuario || password !== usuario.hashcontrasena) return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });

      const token = generateJwtToken(usuario.correo, userType);
      return res.json({ success: true, token, user: usuario, userType });
    }

    if (['cliente', 'client'].includes(userType.toLowerCase())) {
      const cliente = await prisma.cliente.findFirst({ where: { correo, estado: true } });
      if (!cliente || password !== cliente.hashcontrasena) return res.status(400).json({ message: 'Cliente o contraseña incorrectos' });

      const token = generateJwtToken(cliente.correo, userType);
      return res.json({ success: true, token, user: cliente, userType });
    }

    res.status(400).json({ message: 'Tipo de usuario no válido' });
  },

  async requestPasswordReset(req, res) {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ message: 'Correo requerido' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[correo] = { code, expiry: Date.now() + 600000 };

    await sendHtmlEmail(correo, 'Recuperación de Contraseña - DeliciaSoft', getPasswordResetEmailTemplate(code));
    res.json({ message: 'Código de recuperación enviado' });
  },

  async resetPassword(req, res) {
    const { correo, code, userType, newPassword } = req.body;
    const stored = verificationCodes[correo];
    if (!stored || stored.code !== code || Date.now() > stored.expiry) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }
    delete verificationCodes[correo];

    if (['admin', 'usuario'].includes(userType.toLowerCase())) {
      await prisma.usuario.updateMany({ where: { correo, estado: true }, data: { hashcontrasena: newPassword } });
      return res.json({ message: 'Contraseña actualizada con éxito' });
    }

    if (['cliente', 'client'].includes(userType.toLowerCase())) {
      await prisma.cliente.updateMany({ where: { correo, estado: true }, data: { hashcontrasena: newPassword } });
      return res.json({ message: 'Contraseña actualizada con éxito' });
    }

    res.status(400).json({ message: 'Tipo de usuario no válido' });
  }
};
