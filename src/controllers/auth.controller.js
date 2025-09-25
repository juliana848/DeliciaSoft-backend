const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const verificationCodes = {}; 

// CONFIGURACIÓN CORRECTA DEL TRANSPORTER
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS 
  }
});

// Verificar configuración del email
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error configuración email:', error);
  } else {
    console.log('✅ Servidor email configurado correctamente');
  }
});

// Generar JWT
function generateJwtToken(correo, userType) {
  return jwt.sign({ correo, userType }, process.env.JWT_SECRET || 'deliciasoft-secret-key', { expiresIn: '2h' });
}

// Plantilla HTML simple y efectiva
function getVerificationEmailTemplate(code) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificación - DeliciaSoft</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">DeliciaSoft</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Código de Verificación</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                  <div style="font-size: 60px; margin-bottom: 20px;">🔐</div>
                  <h2 style="color: #e91e63; margin: 0; font-size: 24px; font-weight: bold;">Tu código de verificación</h2>
                  <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Usa este código para completar tu inicio de sesión</p>
              </div>

              <!-- Code Box -->
              <div style="background: linear-gradient(135deg, #e91e63 0%, #f8bbd9 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                  <p style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Tu código es:</p>
                  <div style="background-color: #ffffff; border-radius: 8px; padding: 25px; margin: 15px 0; display: inline-block;">
                      <span style="font-size: 42px; font-weight: bold; color: #e91e63; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</span>
                  </div>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Este código expira en 10 minutos</p>
              </div>

              <!-- Instructions -->
              <div style="background-color: #fce4ec; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <h3 style="color: #e91e63; margin: 0 0 15px 0; font-size: 18px;">📝 Instrucciones importantes:</h3>
                  <ul style="color: #666; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                      <li><strong>Ingresa este código en la aplicación</strong></li>
                      <li>El código es válido por <strong>10 minutos solamente</strong></li>
                      <li><strong>No compartas este código</strong> con nadie</li>
                      <li>Si no solicitaste esto, <strong>ignora este mensaje</strong></li>
                  </ul>
              </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; margin: 0; font-size: 12px;">© 2024 DeliciaSoft. Todos los derechos reservados.</p>
              <p style="color: #999; margin: 5px 0 0 0; font-size: 12px;">Este es un mensaje automático, por favor no responder.</p>
          </div>
      </div>
  </body>
  </html>
  `;
}

// Función para enviar email
async function sendVerificationEmail(correo, code) {
  try {
    console.log(`📧 Enviando código ${code} a: ${correo}`);
    
    const mailOptions = {
      from: {
        name: 'DeliciaSoft',
        address: process.env.EMAIL_USER
      },
      to: correo,
      subject: 'Código de Verificación - DeliciaSoft',
      html: getVerificationEmailTemplate(code)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

// Buscar usuario en ambas tablas
async function buscarUsuario(correo) {
  try {
    // Buscar en usuarios (admins)
    const usuario = await prisma.usuarios.findFirst({
      where: { correo, estado: true }
    });
    
    if (usuario) {
      return { encontrado: true, datos: usuario, tipo: 'admin' };
    }

    // Buscar en clientes
    const cliente = await prisma.cliente.findFirst({
      where: { correo, estado: true }
    });
    
    if (cliente) {
      return { encontrado: true, datos: cliente, tipo: 'cliente' };
    }

    return { encontrado: false, datos: null, tipo: null };
  } catch (error) {
    console.error('Error buscando usuario:', error);
    return { encontrado: false, datos: null, tipo: null };
  }
}

module.exports = {
  // 1. ENVIAR CÓDIGO DE VERIFICACIÓN PARA LOGIN
  async enviarCodigoVerificacion(req, res) {
    try {
      const { correo } = req.body;
      console.log('🔍 Solicitando código para:', correo);

      if (!correo) {
        return res.status(400).json({
          success: false,
          message: 'Correo electrónico es requerido'
        });
      }

      // Verificar que el usuario existe
      const { encontrado, tipo } = await buscarUsuario(correo);
      
      if (!encontrado) {
        return res.status(404).json({
          success: false,
          message: 'No existe una cuenta con este correo electrónico'
        });
      }

      // Generar código de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔑 Código generado: ${codigo} para ${correo}`);

      // Guardar en memoria con expiración
      verificationCodes[correo] = {
        codigo: codigo,
        expira: Date.now() + 10 * 60 * 1000, // 10 minutos
        tipo: tipo,
        intentos: 0
      };

      // Enviar email
      await sendVerificationEmail(correo, codigo);

      res.json({
        success: true,
        message: 'Código de verificación enviado',
        codigo: codigo // SOLO PARA DESARROLLO - QUITAR EN PRODUCCIÓN
      });

    } catch (error) {
      console.error('❌ Error enviando código:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // 2. VERIFICAR CÓDIGO Y HACER LOGIN
  async verificarCodigoYLogin(req, res) {
    try {
      const { correo, codigo, password } = req.body;
      console.log('🔐 Verificando código para login:', correo);

      if (!correo || !codigo || !password) {
        return res.status(400).json({
          success: false,
          message: 'Correo, código y contraseña son requeridos'
        });
      }

      // Verificar código
      const codigoGuardado = verificationCodes[correo];
      
      if (!codigoGuardado) {
        return res.status(400).json({
          success: false,
          message: 'No hay código pendiente para este correo'
        });
      }

      if (Date.now() > codigoGuardado.expira) {
        delete verificationCodes[correo];
        return res.status(400).json({
          success: false,
          message: 'El código ha expirado'
        });
      }

      if (codigoGuardado.codigo !== codigo) {
        codigoGuardado.intentos++;
        if (codigoGuardado.intentos >= 3) {
          delete verificationCodes[correo];
          return res.status(400).json({
            success: false,
            message: 'Demasiados intentos fallidos'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Código incorrecto'
        });
      }

      // Código correcto, ahora verificar contraseña
      const { encontrado, datos, tipo } = await buscarUsuario(correo);
      
      if (!encontrado) {
        delete verificationCodes[correo];
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña
      if (datos.hashcontrasena !== password) {
        delete verificationCodes[correo];
        return res.status(401).json({
          success: false,
          message: 'Contraseña incorrecta'
        });
      }

      // Todo correcto - limpiar código y generar token
      delete verificationCodes[correo];
      
      const token = generateJwtToken(correo, tipo);
      
      console.log('✅ Login exitoso para:', correo);
      
      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token: token,
        user: datos,
        userType: tipo
      });

    } catch (error) {
      console.error('❌ Error en verificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // 3. SOLICITAR CÓDIGO PARA RECUPERAR CONTRASEÑA
  async solicitarRecuperacionPassword(req, res) {
    try {
      const { correo } = req.body;
      console.log('🔄 Solicitando recuperación para:', correo);

      if (!correo) {
        return res.status(400).json({
          success: false,
          message: 'Correo electrónico es requerido'
        });
      }

      // Verificar que el usuario existe
      const { encontrado, tipo } = await buscarUsuario(correo);
      
      if (!encontrado) {
        return res.status(404).json({
          success: false,
          message: 'No existe una cuenta con este correo electrónico'
        });
      }

      // Generar código
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Guardar en memoria
      verificationCodes[`reset_${correo}`] = {
        codigo: codigo,
        expira: Date.now() + 10 * 60 * 1000,
        tipo: tipo,
        intentos: 0
      };

      // Enviar email
      await sendVerificationEmail(correo, codigo);

      res.json({
        success: true,
        message: 'Código de recuperación enviado',
        codigo: codigo // SOLO PARA DESARROLLO
      });

    } catch (error) {
      console.error('❌ Error en recuperación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // 4. CAMBIAR CONTRASEÑA CON CÓDIGO
  async cambiarPasswordConCodigo(req, res) {
    try {
      const { correo, codigo, nuevaPassword } = req.body;
      console.log('🔑 Cambiando contraseña para:', correo);

      if (!correo || !codigo || !nuevaPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar código de recuperación
      const codigoGuardado = verificationCodes[`reset_${correo}`];
      
      if (!codigoGuardado || codigoGuardado.codigo !== codigo || Date.now() > codigoGuardado.expira) {
        return res.status(400).json({
          success: false,
          message: 'Código inválido o expirado'
        });
      }

      // Actualizar contraseña según el tipo de usuario
      let actualizado = false;
      
      if (codigoGuardado.tipo === 'admin') {
        const result = await prisma.usuarios.updateMany({
          where: { correo, estado: true },
          data: { hashcontrasena: nuevaPassword }
        });
        actualizado = result.count > 0;
      } else {
        const result = await prisma.cliente.updateMany({
          where: { correo, estado: true },
          data: { hashcontrasena: nuevaPassword }
        });
        actualizado = result.count > 0;
      }

      if (!actualizado) {
        return res.status(404).json({
          success: false,
          message: 'No se pudo actualizar la contraseña'
        });
      }

      // Limpiar código
      delete verificationCodes[`reset_${correo}`];

      console.log('✅ Contraseña cambiada para:', correo);
      
      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // 5. LOGIN DIRECTO (SIN CÓDIGO) - PARA COMPATIBILIDAD
  async loginDirecto(req, res) {
    try {
      const { correo, password } = req.body;
      console.log('🔓 Login directo para:', correo);

      if (!correo || !password) {
        return res.status(400).json({
          success: false,
          message: 'Correo y contraseña son requeridos'
        });
      }

      const { encontrado, datos, tipo } = await buscarUsuario(correo);
      
      if (!encontrado) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (datos.hashcontrasena !== password) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña incorrecta'
        });
      }

      const token = generateJwtToken(correo, tipo);
      
      res.json({
        success: true,
        token: token,
        user: datos,
        userType: tipo
      });

    } catch (error) {
      console.error('❌ Error en login directo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};