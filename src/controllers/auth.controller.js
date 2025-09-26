const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

// CONFIGURACIÓN MEJORADA DEL TRANSPORTER PARA PRODUCCIÓN
const createTransporter = () => {
  console.log('🔧 Configurando transporter para producción...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS existe:', !!process.env.EMAIL_PASS);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Configuración específica para Gmail en producción
  const transporterConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Asegúrate de que esta es la contraseña de aplicación
    },
    // Configuración robusta para producción
    secure: false, // false para STARTTLS en puerto 587
    port: 587,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    // Configuraciones adicionales para producción
    pool: true,
    maxConnections: 5,
    maxMessages: 10,
    rateLimit: 5, // máximo 5 emails por segundo
    // Timeouts más largos para conexiones lentas
    connectionTimeout: 60000, // 60 segundos
    greetingTimeout: 30000, // 30 segundos
    socketTimeout: 60000, // 60 segundos
  };

  return nodemailer.createTransport(transporterConfig);
};

const transporter = createTransporter();

// Función mejorada para enviar email con reintentos y mejor manejo de errores
async function sendHtmlEmail(to, subject, html, maxRetries = 3) {
  const mailOptions = {
    from: `"DeliciaSoft" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  console.log('📧 Intentando enviar email a:', to);
  console.log('📧 Configuración del email:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${maxRetries}`);
      
      // Verificar conexión antes de enviar
      console.log('🔍 Verificando conexión SMTP...');
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada exitosamente');
      
      // Enviar el email
      console.log('📤 Enviando email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente');
      console.log('📨 Message ID:', info.messageId);
      console.log('📨 Response:', info.response);
      console.log('📨 Accepted:', info.accepted);
      console.log('📨 Rejected:', info.rejected);
      
      return info;
      
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      });
      
      // Log del stack completo solo en el último intento
      if (attempt === maxRetries) {
        console.error('❌ Stack completo del error:', error.stack);
        console.error('❌ Todos los intentos de envío fallaron');
        
        // Crear un error más descriptivo
        const detailedError = new Error(`Email delivery failed after ${maxRetries} attempts: ${error.message}`);
        detailedError.originalError = error;
        detailedError.code = error.code;
        detailedError.response = error.response;
        throw detailedError;
      }
      
      // Esperar antes del siguiente intento (backoff exponencial)
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Generar JWT
function generateJwtToken(correo, userType) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }
  return jwt.sign({ correo, userType }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

// Plantilla HTML: Código de verificación (mejorada)
function getVerificationEmailTemplate(code) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificación - DeliciaSoft</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #fce4ec; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; }
        .header p { color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .icon-container { text-align: center; margin-bottom: 30px; }
        .icon-bg { background-color: #f8bbd9; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .code-container { background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; }
        .code-box { background-color: #ffffff; border-radius: 8px; padding: 20px; margin: 15px 0; display: inline-block; }
        .code { font-size: 36px; font-weight: bold; color: #e91e63; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .warning { background-color: #fce4ec; border-radius: 8px; padding: 20px; margin: 30px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>DeliciaSoft</h1>
              <p>Tu plataforma de confianza</p>
          </div>
          <div class="content">
              <div class="icon-container">
                  <div class="icon-bg">
                      <span style="font-size: 40px;">🔐</span>
                  </div>
                  <h2 style="color: #e91e63; margin: 0; font-size: 24px; font-weight: bold;">Código de Verificación</h2>
                  <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Hemos recibido una solicitud para verificar tu cuenta</p>
              </div>
              <div class="code-container">
                  <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Tu código de verificación es:</p>
                  <div class="code-box">
                      <span class="code">${code}</span>
                  </div>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Este código expira en 10 minutos</p>
              </div>
              <div class="warning">
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
          <div class="footer">
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
  return getVerificationEmailTemplate(code)
    .replace("Código de Verificación", "Recuperación de Contraseña")
    .replace("🔐", "🔓")
    .replace("verificar tu cuenta", "recuperar tu contraseña");
}

// Función para validar variables de entorno críticas
function validateEnvironmentVariables() {
  const required = ['EMAIL_USER', 'EMAIL_PASS', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missing);
    console.error('❌ Verifica que estas variables estén configuradas en Render:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }
  
  console.log('✅ Todas las variables de entorno requeridas están configuradas');
  return true;
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
      // Validar variables de entorno al inicio
      if (!validateEnvironmentVariables()) {
        return res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor. Variables de entorno faltantes.',
          configError: true
        });
      }

      let { correo, userType } = req.body;
      
      if (!correo) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo es requerido' 
        });
      }

      console.log('📧 Procesando solicitud de código para:', correo);
      console.log('🔧 Variables de entorno verificadas:');
      console.log('EMAIL_USER:', process.env.EMAIL_USER);
      console.log('EMAIL_PASS longitud:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
      console.log('JWT_SECRET configurado:', !!process.env.JWT_SECRET);
      console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

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

      // Intentar enviar email con manejo robusto de errores
      try {
        console.log('📧 Iniciando proceso de envío de email...');
        
        const emailInfo = await sendHtmlEmail(
          correo, 
          'Código de Verificación - DeliciaSoft', 
          getVerificationEmailTemplate(code)
        );
        
        console.log('✅ Email enviado exitosamente');
        
        // En producción, no devolver el código
        const response = {
          success: true,
          message: 'Código enviado exitosamente', 
          userType: userType,
          emailSent: true,
          messageId: emailInfo.messageId
        };

        // Solo incluir el código en desarrollo
        if (process.env.NODE_ENV !== 'production') {
          response.codigo = code;
        }

        res.json(response);
        
      } catch (emailError) {
        console.error('❌ Error crítico enviando email:', {
          message: emailError.message,
          code: emailError.code,
          response: emailError.response,
          originalError: emailError.originalError
        });
        
        // En desarrollo, permitir continuar con código de fallback
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔄 Usando código por defecto en desarrollo');
          res.json({ 
            success: true,
            message: 'Código generado (email temporalmente no disponible)', 
            codigo: '123456', // Código por defecto para desarrollo
            userType: userType,
            emailSent: false,
            emailError: emailError.message,
            fallback: true
          });
        } else {
          // En producción, fallar si no se puede enviar el email
          console.error('❌ Error crítico en producción - no se pudo enviar email');
          res.status(500).json({
            success: false,
            message: 'Error enviando código de verificación. Intenta nuevamente.',
            emailError: true
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error general en sendVerificationCode:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  },

  async verifyCodeAndLogin(req, res) {
    try {
      const { correo, codigo, password } = req.body;
      
      console.log('🔍 Verificando código de login para:', correo);
      
      if (!correo || !codigo || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo, código y contraseña son requeridos' 
        });
      }

      // Verificar código (permitir código por defecto solo en desarrollo)
      const stored = verificationCodes[correo];
      const isValidCode = stored && 
        stored.code === codigo && 
        Date.now() <= stored.expiry;

      // En desarrollo, permitir código de fallback
      const isDevelopmentFallback = process.env.NODE_ENV !== 'production' && codigo === '123456';

      if (!isValidCode && !isDevelopmentFallback) {
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
      if (!validateEnvironmentVariables()) {
        return res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor'
        });
      }

      const { correo } = req.body;
      if (!correo) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo requerido' 
        });
      }

      console.log('🔍 Solicitando reset de contraseña para:', correo);

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
        
        const response = {
          success: true,
          message: 'Código de recuperación enviado'
        };

        if (process.env.NODE_ENV !== 'production') {
          response.codigo = code;
        }

        res.json(response);
        
      } catch (emailError) {
        console.error('❌ Error enviando email de reset:', emailError);
        
        if (process.env.NODE_ENV !== 'production') {
          res.json({ 
            success: true,
            message: 'Código generado (email temporalmente no disponible)',
            codigo: code,
            emailSent: false
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error enviando código de recuperación'
          });
        }
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