const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

// CONFIGURACIÓN SIMPLE Y ROBUSTA DEL TRANSPORTER
let transporter = null;

function initializeTransporter() {
  try {
    console.log('🔧 Inicializando transporter...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS existe:', !!process.env.EMAIL_PASS);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ EMAIL_USER o EMAIL_PASS no están configurados');
      return null;
    }

    transporter = nodemailer.createTransport({
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

    console.log('✅ Transporter inicializado correctamente');
    return transporter;

  } catch (error) {
    console.error('❌ Error inicializando transporter:', error.message);
    return null;
  }
}

// Inicializar al cargar el módulo
initializeTransporter();

// Función simplificada para enviar email
async function sendHtmlEmail(to, subject, html) {
  if (!transporter) {
    console.log('⚠️ Transporter no disponible, reinicializando...');
    initializeTransporter();
  }

  if (!transporter) {
    throw new Error('No se pudo configurar el servicio de email');
  }

  const mailOptions = {
    from: `"DeliciaSoft" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  console.log('📧 Enviando email a:', to);
  
  try {
    // Verificar conexión
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada');
    
    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', info.messageId);
    
    return info;
    
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
}

// Generar JWT
function generateJwtToken(correo, userType) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado');
  }
  return jwt.sign({ correo, userType }, process.env.JWT_SECRET, { expiresIn: '2h' });
}

// Plantilla HTML simple
function getVerificationEmailTemplate(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e91e63; text-align: center;">DeliciaSoft - Código de Verificación</h2>
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; text-align: center;">
        <p style="font-size: 18px; margin-bottom: 20px;">Tu código de verificación es:</p>
        <div style="background-color: #e91e63; color: white; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
          ${code}
        </div>
        <p style="margin-top: 20px; color: #666;">Este código expira en 10 minutos.</p>
        <p style="color: #666;">No compartas este código con nadie.</p>
      </div>
    </div>
  `;
}

module.exports = {
  // Login directo sin código de verificación  
  async directLogin(req, res) {
    try {
      const { correo, password } = req.body;
      
      if (!correo || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo y contraseña son requeridos' 
        });
      }

      let user = null;
      let actualUserType = '';

      // Buscar en usuarios primero
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

      // Si no se encontró, buscar en clientes
      if (!user) {
        try {
          user = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (user && user.hashcontrasena === password) {
            actualUserType = 'cliente';
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
      const { correo, userType } = req.body;
      
      console.log('📧 Procesando código para:', correo);
      
      if (!correo) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo es requerido' 
        });
      }

      // Verificar variables de entorno críticas
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.JWT_SECRET) {
        console.error('❌ Variables de entorno faltantes');
        return res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor'
        });
      }

      // Detectar tipo de usuario si no se especifica
      let detectedUserType = userType;
      
      if (!detectedUserType) {
        try {
          const usuario = await prisma.usuarios.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (usuario) {
            detectedUserType = 'admin';
          } else {
            const cliente = await prisma.cliente.findFirst({ 
              where: { correo, estado: true } 
            });
            
            if (cliente) {
              detectedUserType = 'cliente';
            } else {
              return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
              });
            }
          }
        } catch (dbError) {
          console.error('❌ Error consultando BD:', dbError.message);
          return res.status(500).json({ 
            success: false,
            message: 'Error consultando base de datos' 
          });
        }
      }

      // Generar código
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodes[correo] = { 
        code, 
        expiry: Date.now() + 600000, // 10 minutos
        userType: detectedUserType 
      };

      console.log(`🔑 Código generado: ${code} para ${correo} (${detectedUserType})`);

      // Intentar enviar email
      try {
        await sendHtmlEmail(
          correo, 
          'Código de Verificación - DeliciaSoft', 
          getVerificationEmailTemplate(code)
        );
        
        const response = {
          success: true,
          message: 'Código enviado exitosamente', 
          userType: detectedUserType,
          emailSent: true
        };

        // Solo en desarrollo incluir el código
        if (process.env.NODE_ENV !== 'production') {
          response.codigo = code;
        }

        res.json(response);
        
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError.message);
        
        // Fallback según entorno
        if (process.env.NODE_ENV !== 'production') {
          res.json({ 
            success: true,
            message: 'Código generado (email no disponible)', 
            codigo: code,
            userType: detectedUserType,
            emailSent: false,
            fallback: true
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Error enviando código. Intenta nuevamente.'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error general:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  async verifyCodeAndLogin(req, res) {
    try {
      const { correo, codigo, password } = req.body;
      
      console.log('🔍 Verificando código para login:', correo);
      
      if (!correo || !codigo || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo, código y contraseña requeridos' 
        });
      }

      // Verificar código
      const stored = verificationCodes[correo];
      const isValidCode = stored && 
        stored.code === codigo && 
        Date.now() <= stored.expiry;

      // Permitir código de desarrollo
      const isDevelopmentFallback = process.env.NODE_ENV !== 'production' && codigo === '123456';

      if (!isValidCode && !isDevelopmentFallback) {
        return res.status(400).json({ 
          success: false,
          message: 'Código inválido o expirado' 
        });
      }

      // Limpiar código usado
      if (stored) {
        delete verificationCodes[correo];
      }

      // Buscar usuario y verificar contraseña
      let user = null;
      let actualUserType = '';

      try {
        // Buscar en usuarios
        user = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user && user.hashcontrasena === password) {
          actualUserType = 'admin';
        } else {
          user = null;
          
          // Buscar en clientes
          user = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (user && user.hashcontrasena === password) {
            actualUserType = 'cliente';
          }
        }
      } catch (dbError) {
        console.error('❌ Error en login BD:', dbError);
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

      // Verificar si usuario existe
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
        console.error('❌ Error verificando usuario:', dbError);
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

      // Intentar enviar email
      try {
        await sendHtmlEmail(
          correo, 
          'Recuperación de Contraseña - DeliciaSoft', 
          getVerificationEmailTemplate(code)
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
        console.error('❌ Error enviando email reset:', emailError);
        
        if (process.env.NODE_ENV !== 'production') {
          res.json({ 
            success: true,
            message: 'Código generado (email no disponible)',
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
      console.error('❌ Error en password reset:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const { correo, codigo, nuevaPassword } = req.body;
      
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
        // Intentar actualizar en usuarios
        const usuarioResult = await prisma.usuarios.updateMany({ 
          where: { correo, estado: true }, 
          data: { hashcontrasena: nuevaPassword } 
        });
        
        if (usuarioResult.count > 0) {
          updated = true;
        } else {
          // Intentar en clientes
          const clienteResult = await prisma.cliente.updateMany({ 
            where: { correo, estado: true }, 
            data: { hashcontrasena: nuevaPassword } 
          });
          
          if (clienteResult.count > 0) {
            updated = true;
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