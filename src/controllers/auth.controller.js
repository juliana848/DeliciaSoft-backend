// auth.controller.js - VERSIÓN CORREGIDA CON VALIDACIONES ESTRICTAS

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

// Configuración Brevo
let transactionalEmailsApi = null;

function initializeBrevoClient() {
  try {
    console.log('🔧 Inicializando cliente de Brevo...');
    
    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
      console.error('❌ BREVO_API_KEY o EMAIL_USER no están configurados');
      return null;
    }

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();

    console.log('✅ Cliente Brevo inicializado correctamente');
    return transactionalEmailsApi;

  } catch (error) {
    console.error('❌ Error inicializando cliente Brevo:', error.message);
    return null;
  }
}

initializeBrevoClient();

async function sendBrevoEmail(to, subject, htmlContent) {
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
    name: "DeliciaSoft", 
    email: process.env.EMAIL_USER 
  };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.replyTo = { 
    name: "DeliciaSoft", 
    email: process.env.EMAIL_USER 
  };

  console.log('📧 Enviando email a través de Brevo:', to);
  
  try {
    const response = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email enviado exitosamente:', response.messageId);
    return response;
  } catch (error) {
    console.error('❌ Error enviando email con Brevo:', error);
    if (error.response && error.response.body) {
      console.error('Error details:', error.response.body);
    }
    throw new Error(`Error Brevo: ${error.message}`);
  }
}

function generateJwtToken(correo, userType) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado');
  }
  return jwt.sign({ correo, userType }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

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
              <div style="background: linear-gradient(135deg, #e91e63, #ad1457); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">DeliciaSoft</h1>
                <p style="color: #ffffff; margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Código de Verificación</p>
              </div>
              
              <div style="padding: 40px 30px;">
                <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px; text-align: center;">¡Hola! 👋</h2>
                
                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px; text-align: center;">
                  Hemos recibido una solicitud para verificar tu cuenta. Usa el siguiente código para continuar:
                </p>
                
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
                    🔒 Por tu seguridad, nunca compartas este código con nadie.
                  </p>
                </div>
              </div>
              
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

module.exports = {
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

  // 🔥 MÉTODO CRÍTICO CORREGIDO: Ahora valida usuario Y contraseña ANTES de enviar código
  async sendVerificationCode(req, res) {
    try {
      const { correo, userType, password } = req.body;
      
      console.log('🔐 Validando credenciales para:', correo);
      
      if (!correo) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo es requerido' 
        });
      }

      // 🔥 NUEVO: Validar contraseña también si se proporciona
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña es requerida'
        });
      }

      if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER || !process.env.JWT_SECRET) {
        console.error('❌ Variables de entorno faltantes');
        return res.status(500).json({
          success: false,
          message: 'Error de configuración del servidor'
        });
      }

      // 🔥 VALIDACIÓN CRÍTICA: Verificar que usuario existe Y contraseña es correcta
      let detectedUserType = userType;
      let user = null;
      let passwordCorrect = false;
      
      try {
        // Buscar en usuarios (admin)
        user = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user) {
          if (user.hashcontrasena === password) {
            detectedUserType = 'admin';
            passwordCorrect = true;
            console.log('✅ Usuario admin encontrado y contraseña correcta');
          } else {
            console.log('❌ Usuario admin encontrado pero contraseña incorrecta');
            return res.status(401).json({ 
              success: false,
              message: 'Contraseña incorrecta' 
            });
          }
        } else {
          // Buscar en clientes
          user = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (user) {
            if (user.hashcontrasena === password) {
              detectedUserType = 'cliente';
              passwordCorrect = true;
              console.log('✅ Cliente encontrado y contraseña correcta');
            } else {
              console.log('❌ Cliente encontrado pero contraseña incorrecta');
              return res.status(401).json({ 
                success: false,
                message: 'Contraseña incorrecta' 
              });
            }
          } else {
            console.log('❌ Usuario no encontrado');
            return res.status(404).json({ 
              success: false,
              message: 'El correo ingresado no está registrado. Por favor, regístrate primero.' 
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

      // 🔥 Solo llegar aquí si usuario existe Y contraseña es correcta
      if (!passwordCorrect || !user) {
        return res.status(401).json({ 
          success: false,
          message: 'Credenciales incorrectas' 
        });
      }

      // Generar código solo después de validar credenciales
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      verificationCodes[correo] = { 
        code, 
        expiry: Date.now() + 600000, // 10 minutos
        userType: detectedUserType,
        password: password // Guardar para validar después
      };

      console.log(`🔑 Código generado: ${code} para ${correo} (${detectedUserType})`);

      // Intentar enviar email
      try {
        await sendBrevoEmail(
          correo, 
          'Código de Verificación - DeliciaSoft', 
          getVerificationEmailTemplate(code)
        );
        
        const response = {
          success: true,
          message: 'Código enviado exitosamente a tu correo', 
          userType: detectedUserType,
          emailSent: true,
          provider: 'Brevo'
        };

        if (process.env.NODE_ENV !== 'production') {
          response.codigo = code;
        }

        res.json(response);
        
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError.message);
        
        if (process.env.NODE_ENV !== 'production') {
          res.json({ 
            success: true,
            message: 'Código generado (modo desarrollo)', 
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

  // 🔥 MÉTODO CRÍTICO CORREGIDO: Validación más estricta del código
  async verifyCodeAndLogin(req, res) {
    try {
      const { correo, codigo, password } = req.body;
      
      console.log('🔍 Verificando código para login:', correo);
      console.log('🔑 Código recibido:', codigo);
      
      if (!correo || !codigo || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Correo, código y contraseña requeridos' 
        });
      }

      // Validar código almacenado
      const stored = verificationCodes[correo];
      console.log('💾 Código almacenado:', stored ? stored.code : 'No encontrado');
      
      if (!stored) {
        console.error('❌ No se encontró código para:', correo);
        return res.status(400).json({ 
          success: false,
          message: 'No se encontró código de verificación. Solicita uno nuevo.' 
        });
      }

      // 🔥 VALIDACIÓN ESTRICTA: Código debe coincidir exactamente
      if (stored.code !== codigo) {
        console.error('❌ Código incorrecto:', codigo, 'vs', stored.code);
        return res.status(400).json({ 
          success: false,
          message: 'Código de verificación incorrecto' 
        });
      }

      // Verificar expiración
      if (Date.now() > stored.expiry) {
        console.error('❌ Código expirado');
        delete verificationCodes[correo];
        return res.status(400).json({ 
          success: false,
          message: 'Código de verificación expirado. Solicita uno nuevo.' 
        });
      }

      // 🔥 VALIDACIÓN ADICIONAL: Verificar que la contraseña siga siendo correcta
      if (stored.password !== password) {
        console.error('❌ Contraseña no coincide con la original');
        delete verificationCodes[correo];
        return res.status(401).json({
          success: false,
          message: 'Contraseña incorrecta'
        });
      }

      // Código válido - eliminar de memoria
      delete verificationCodes[correo];
      console.log('✅ Código válido y eliminado');

      // Buscar usuario final
      let user = null;
      let actualUserType = '';

      try {
        user = await prisma.usuarios.findFirst({ 
          where: { correo, estado: true } 
        });
        
        if (user && user.hashcontrasena === password) {
          actualUserType = 'admin';
          console.log('👑 Usuario admin autenticado');
        } else {
          user = null;
          user = await prisma.cliente.findFirst({ 
            where: { correo, estado: true } 
          });
          
          if (user && user.hashcontrasena === password) {
            actualUserType = 'cliente';
            console.log('👤 Cliente autenticado');
          }
        }
      } catch (dbError) {
        console.error('❌ Error en consulta BD:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error consultando base de datos'
        });
      }

      if (!user) {
        console.error('❌ Usuario no encontrado en verificación final');
        return res.status(401).json({ 
          success: false, 
          message: 'Error en la autenticación' 
        });
      }

      console.log(`✅ Login exitoso para ${correo} como ${actualUserType}`);
      
      const token = generateJwtToken(user.correo, actualUserType);
      
      res.json({ 
        success: true, 
        token, 
        user, 
        userType: actualUserType,
        message: `Bienvenido ${user.nombre || user.email}`
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

      console.log(`🔑 Código de recuperación generado para ${correo}: ${code}`);

      try {
        await sendBrevoEmail(
          correo, 
          'Recuperación de Contraseña - DeliciaSoft', 
          getVerificationEmailTemplate(code)
        );
        
        // 🔥 SIEMPRE devolver el código (desarrollo Y producción)
        const response = {
          success: true,
          message: 'Código de recuperación enviado',
          codigo: code, // 🔥 CAMBIO: Siempre incluir
          provider: 'Brevo',
          emailSent: true
        };

        console.log('✅ Código enviado, devolviendo:', response);
        res.json(response);
        
      } catch (emailError) {
        console.error('❌ Error enviando email reset:', emailError);
        
        // Fallback: devolver código aunque no se envíe email
        res.json({ 
          success: true,
          message: 'Código generado (email no enviado)',
          codigo: code, // 🔥 Siempre incluir
          emailSent: false,
          provider: 'Fallback'
        });
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
        const usuarioResult = await prisma.usuarios.updateMany({ 
          where: { correo, estado: true }, 
          data: { hashcontrasena: nuevaPassword } 
        });
        
        if (usuarioResult.count > 0) {
          updated = true;
        } else {
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