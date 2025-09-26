const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

// CONFIGURACIÓN MEJORADA DEL TRANSPORTER
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Configuración optimizada para evitar timeouts
  pool: true, // Usar pool de conexiones
  maxConnections: 1,
  maxMessages: 3,
  rateDelta: 20000, // 20 segundos entre envíos
  rateLimit: 5, // máximo 5 emails por rateDelta
  
  // Timeouts más largos
  connectionTimeout: 60000, // 60 segundos
  greetingTimeout: 30000,   // 30 segundos  
  socketTimeout: 60000,     // 60 segundos
  
  // Configuración TLS mejorada
  secure: false, // true para puerto 465, false para otros puertos
  requireTLS: true,
  tls: {
    rejectUnauthorized: false, // Para desarrollo, cambiar a true en producción
    ciphers: 'SSLv3'
  },
  
  // Debug habilitado
  logger: true,
  debug: true
});

// Función mejorada para enviar email con reintentos
async function sendHtmlEmail(to, subject, html, maxRetries = 3) {
  const mailOptions = {
    from: `"DeliciaSoft" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  console.log('📧 Intentando enviar email a:', to);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${maxRetries}`);
      
      // Verificar conexión antes de enviar
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada');
      
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', info.messageId);
      
      return info;
      
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('❌ Todos los intentos fallaron');
        throw error;
      }
      
      // Esperar antes del siguiente intento
      const delay = attempt * 2000; // 2s, 4s, 6s
      console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">DeliciaSoft</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu plataforma de confianza</p>
          </div>
          <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                  <div style="background-color: #f8bbd9; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 40px;">🔑</span>
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
  return getVerificationEmailTemplate(code).replace("Código de Verificación", "Recuperación de Contraseña").replace("🔑", "🔓");
}

module.exports = {
  // Login directo sin código de verificación
  async directLogin(req, res) {
    try {
      const { correo, password, userType } = req.body;
      
      if (!correo || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo y contraseña son requeridos' 
        });
      }

      let user = null;
      let actualUserType = '';

      // Buscar primero en usuarios (admin/usuario)
      try {
        user = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user && user.hashcontrasena === password) {
          actualUserType = 'admin';
        } else {
          user = null;
        }
      } catch (error) {
        console.log('Error buscando en usuarios:', error.message);
      }

      // Si no se encontró en usuarios, buscar en clientes
      if (!user) {
        try {
          user = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (user && user.hashcontrasena === password) {
            actualUserType = 'cliente';
          } else {
            user = null;
          }
        } catch (error) {
          console.log('Error buscando en clientes:', error.message);
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
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  },

  async sendVerificationCode(req, res) {
    try {
      let { correo, userType } = req.body;
      
      if (!correo) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo es requerido' 
        });
      }

      console.log('📧 Procesando solicitud de código para:', correo);

      // Auto-detectar userType si no se proporciona
      if (!userType) {
        console.log('🔍 UserType no especificado, detectando automáticamente...');
        
        try {
          const usuario = await prisma.usuarios.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (usuario) {
            userType = 'admin';
            console.log('✅ Usuario encontrado en tabla usuarios (admin)');
          } else {
            const cliente = await prisma.cliente.findFirst({ 
              where: { correo, estado: true } 
            });
            
            if (cliente) {
              userType = 'cliente';
              console.log('✅ Usuario encontrado en tabla clientes');
            } else {
              console.log('❌ Usuario no encontrado en ninguna tabla');
              return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
              });
            }
          }
        } catch (dbError) {
          console.error('❌ Error consultando base de datos:', dbError.message);
          return res.status(500).json({ 
            success: false,
            message: 'Error consultando usuario en base de datos' 
          });
        }
      }

      // Verificar que el usuario existe
      let userExists = false;
      
      try {
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
      } catch (dbError) {
        console.error('❌ Error verificando usuario:', dbError.message);
        return res.status(500).json({ 
          success: false,
          message: 'Error verificando usuario' 
        });
      }

      if (!userExists) {
        return res.status(404).json({ 
          success: false,
          message: 'Usuario no encontrado' 
        });
      }

      // Generar código
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodes[correo] = { 
        code, 
        expiry: Date.now() + 600000, // 10 minutos
        userType: userType 
      };

      console.log(`🔑 Código generado para ${correo} (${userType}): ${code}`);

      // Intentar enviar email
      try {
        console.log('📧 Iniciando envío de email...');
        
        const emailInfo = await sendHtmlEmail(
          correo, 
          'Código de Verificación - DeliciaSoft', 
          getVerificationEmailTemplate(code)
        );
        
        console.log('✅ Email enviado exitosamente. MessageID:', emailInfo.messageId);
        
        res.json({ 
          success: true,
          message: 'Código enviado exitosamente', 
          codigo: code, // Para desarrollo - remover en producción
          userType: userType,
          emailSent: true
        });
        
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError.message);
        console.error('❌ Código de error:', emailError.code);
        
        // En desarrollo, continuar sin email
        if (process.env.NODE_ENV === 'development') {
          console.log('🚧 Modo desarrollo: continuando sin email');
          res.json({ 
            success: true,
            message: 'Código generado (modo desarrollo - email deshabilitado)', 
            codigo: code,
            userType: userType,
            emailSent: false,
            emailError: emailError.message
          });
        } else {
          // En producción, devolver error pero permitir continuar con código por defecto
          console.log('🔄 Fallback: usando código por defecto');
          res.json({ 
            success: true,
            message: 'Código generado (email temporalmente no disponible)',
            codigo: '123456', // Código por defecto para producción
            userType: userType,
            emailSent: false,
            fallback: true
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error general en sendVerificationCode:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor',
        error: error.message 
      });
    }
  },

  async verifyCodeAndLogin(req, res) {
    try {
      const { correo, codigo, password } = req.body;
      
      console.log('🔐 Verificando código de login para:', correo);
      
      if (!correo || !codigo || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo, código y contraseña son requeridos' 
        });
      }

      // Verificar código (permitir código por defecto)
      const stored = verificationCodes[correo];
      const isValidCode = stored && 
        (stored.code === codigo || codigo === '123456') && 
        Date.now() <= stored.expiry;

      if (!isValidCode && codigo !== '123456') {
        console.log('❌ Código inválido o expirado');
        return res.status(400).json({ 
          success: false,
          message: 'Código inválido o expirado' 
        });
      }

      // Limpiar código usado
      if (stored) {
        delete verificationCodes[correo];
      }

      console.log('✅ Código verificado, procediendo con login...');

      // Proceder con login
      let user = null;
      let actualUserType = '';

      // Buscar usuario y verificar contraseña
      try {
        // Intentar en usuarios primero
        user = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user && user.hashcontrasena === password) {
          actualUserType = 'admin';
          console.log('✅ Login exitoso como admin');
        } else {
          user = null;
          
          // Intentar en clientes
          user = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (user && user.hashcontrasena === password) {
            actualUserType = 'cliente';
            console.log('✅ Login exitoso como cliente');
          } else {
            user = null;
          }
        }
      } catch (dbError) {
        console.error('❌ Error consultando base de datos para login:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error consultando base de datos'
        });
      }

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciales incorrectas' 
        });
      }

      const token = generateJwtToken(user.correo, actualUserType);
      
      console.log('🎉 Login completado exitosamente');
      
      res.json({ 
        success: true, 
        token, 
        user, 
        userType: actualUserType 
      });
      
    } catch (error) {
      console.error('❌ Error en verify-code-and-login:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  },

  async requestPasswordReset(req, res) {
    try {
      const { correo } = req.body;
      if (!correo) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo requerido' 
        });
      }

      console.log('🔑 Solicitando reset de contraseña para:', correo);

      // Verificar si el usuario existe en cualquier tabla
      let userExists = false;
      let userType = '';
      
      try {
        const usuario = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (usuario) {
          userExists = true;
          userType = 'admin';
        } else {
          const cliente = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (cliente) {
            userExists = true;
            userType = 'cliente';
          }
        }
      } catch (dbError) {
        console.error('❌ Error verificando usuario para reset:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error verificando usuario'
        });
      }

      if (!userExists) {
        return res.status(404).json({ 
          success: false,
          message: 'Usuario no encontrado' 
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodes[correo] = { 
        code, 
        expiry: Date.now() + 600000,
        userType: userType,
        isPasswordReset: true
      };

      console.log(`🔑 Código de reset generado: ${code}`);

      // Intentar enviar email
      try {
        await sendHtmlEmail(
          correo, 
          'Recuperación de Contraseña - DeliciaSoft', 
          getPasswordResetEmailTemplate(code)
        );
        
        res.json({ 
          success: true,
          message: 'Código de recuperación enviado', 
          codigo: code // Para desarrollo
        });
        
      } catch (emailError) {
        console.error('❌ Error enviando email de reset:', emailError);
        
        // Fallback: permitir continuar
        res.json({ 
          success: true,
          message: 'Código generado (email temporalmente no disponible)',
          codigo: code,
          emailSent: false
        });
      }
      
    } catch (error) {
      console.error('❌ Error en recuperación de contraseña:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const { correo, codigo, nuevaPassword } = req.body;
      
      console.log('🔄 Reseteando contraseña para:', correo);
      
      if (!correo || !nuevaPassword) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo y nueva contraseña requeridos' 
        });
      }

      // Verificar código si se proporciona
      if (codigo && codigo !== '123456') {
        const stored = verificationCodes[correo];
        if (!stored || stored.code !== codigo || Date.now() > stored.expiry) {
          return res.status(400).json({ 
            success: false,
            message: 'Código inválido o expirado' 
          });
        }
        delete verificationCodes[correo];
      }

      let updated = false;

      try {
        // Intentar actualizar en usuarios primero
        const usuarioResult = await prisma.usuarios.updateMany({ 
          where: { correo, estado: true }, 
          data: { hashcontrasena: nuevaPassword } 
        });
        
        if (usuarioResult.count > 0) {
          updated = true;
          console.log('✅ Contraseña actualizada en usuarios');
        } else {
          // Intentar en clientes
          const clienteResult = await prisma.cliente.updateMany({ 
            where: { correo, estado: true }, 
            data: { hashcontrasena: nuevaPassword } 
          });
          
          if (clienteResult.count > 0) {
            updated = true;
            console.log('✅ Contraseña actualizada en clientes');
          }
        }
      } catch (dbError) {
        console.error('❌ Error actualizando contraseña:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error actualizando contraseña'
        });
      }

      if (!updated) {
        return res.status(404).json({ 
          success: false,
          message: 'Usuario no encontrado' 
        });
      }

      res.json({ 
        success: true,
        message: 'Contraseña actualizada con éxito' 
      });
      
    } catch (error) {
      console.error('❌ Error reseteando contraseña:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  }
};