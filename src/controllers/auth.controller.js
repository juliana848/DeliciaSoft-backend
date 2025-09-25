const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const verificationCodes = {}; // Memoria temporal

// CONFIGURACIÓN DEL TRANSPORTER CON DEBUGGING
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true, // Activar debug
  logger: true // Activar logging
});

// Verificar configuración al iniciar
console.log('🔧 Configuración de email:');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Configurado' : '❌ No configurado');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configurado' : '❌ No configurado');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ No configurado');

// Verificar conexión
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error configuración email:', error);
  } else {
    console.log('✅ Servidor email configurado correctamente');
  }
});

// Generar JWT
function generateJwtToken(correo, userType) {
  return jwt.sign(
    { correo, userType }, 
    process.env.JWT_SECRET || 'deliciasoft-fallback-secret', 
    { expiresIn: '2h' }
  );
}

// Plantilla HTML simplificada para pruebas
function getEmailTemplate(code) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Código de Verificación - DeliciaSoft</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #e91e63; margin-bottom: 10px;">DeliciaSoft</h1>
                <h2 style="color: #333; margin-bottom: 20px;">Código de Verificación</h2>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #e91e63; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; font-size: 18px;">Tu código es:</p>
                    <div style="background: white; color: #e91e63; padding: 15px; border-radius: 5px; font-size: 32px; font-weight: bold; letter-spacing: 5px; font-family: monospace;">
                        ${code}
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Este código expira en 10 minutos</p>
                </div>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 14px;">
                <p>Si no solicitaste este código, ignora este mensaje.</p>
                <p style="margin-top: 20px; font-size: 12px;">© 2024 DeliciaSoft - Mensaje automático</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para enviar email con manejo de errores mejorado
async function sendEmail(to, subject, html) {
  try {
    console.log(`📧 Intentando enviar email a: ${to}`);
    console.log(`📧 Asunto: ${subject}`);
    
    const mailOptions = {
      from: {
        name: 'DeliciaSoft',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      html: html
    };

    console.log('📧 Opciones de correo:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente:', info.messageId);
    console.log('✅ Respuesta del servidor:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error detallado enviando email:', error);
    console.error('❌ Código de error:', error.code);
    console.error('❌ Comando:', error.command);
    throw error;
  }
}

// Buscar usuario con logging detallado
async function buscarUsuario(correo) {
  try {
    console.log(`🔍 Buscando usuario: ${correo}`);
    
    // Buscar en usuarios (admins)
    console.log('🔍 Buscando en tabla usuarios...');
    const usuario = await prisma.usuarios.findFirst({
      where: { 
        correo: correo,
        estado: true 
      }
    });
    
    if (usuario) {
      console.log('✅ Usuario encontrado en tabla usuarios:', usuario.nombre);
      return { encontrado: true, datos: usuario, tipo: 'admin' };
    }

    // Buscar en clientes
    console.log('🔍 Buscando en tabla cliente...');
    const cliente = await prisma.cliente.findFirst({
      where: { 
        correo: correo,
        estado: true 
      }
    });
    
    if (cliente) {
      console.log('✅ Usuario encontrado en tabla cliente:', cliente.nombre);
      return { encontrado: true, datos: cliente, tipo: 'cliente' };
    }

    console.log('❌ Usuario no encontrado en ninguna tabla');
    return { encontrado: false, datos: null, tipo: null };
  } catch (error) {
    console.error('❌ Error buscando usuario:', error);
    return { encontrado: false, datos: null, tipo: null };
  }
}

module.exports = {
  // 1. ENVIAR CÓDIGO DE VERIFICACIÓN PARA LOGIN
  async enviarCodigoVerificacion(req, res) {
    console.log('🚀 === INICIO enviarCodigoVerificacion ===');
    
    try {
      const { correo } = req.body;
      console.log('📨 Request body:', req.body);
      console.log('📨 Correo recibido:', correo);

      if (!correo) {
        console.log('❌ Correo no proporcionado');
        return res.status(400).json({
          success: false,
          message: 'Correo electrónico es requerido'
        });
      }

      // Verificar que el usuario existe
      console.log('🔍 Verificando si el usuario existe...');
      const { encontrado, tipo, datos } = await buscarUsuario(correo);
      
      if (!encontrado) {
        console.log('❌ Usuario no encontrado');
        return res.status(404).json({
          success: false,
          message: 'No existe una cuenta con este correo electrónico'
        });
      }

      console.log(`✅ Usuario encontrado - Tipo: ${tipo}`);

      // Generar código de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔑 Código generado: ${codigo}`);

      // Guardar en memoria con expiración
      verificationCodes[correo] = {
        codigo: codigo,
        expira: Date.now() + 10 * 60 * 1000, // 10 minutos
        tipo: tipo,
        intentos: 0
      };

      console.log('💾 Código guardado en memoria');
      console.log('💾 Códigos en memoria:', Object.keys(verificationCodes));

      // Intentar enviar email
      console.log('📧 Intentando enviar email...');
      
      try {
        const emailResult = await sendEmail(
          correo, 
          'Código de Verificación - DeliciaSoft', 
          getEmailTemplate(codigo)
        );
        
        console.log('✅ Email enviado correctamente:', emailResult);
        
        res.json({
          success: true,
          message: 'Código de verificación enviado',
          codigo: codigo, // QUITAR EN PRODUCCIÓN
          debug: {
            userType: tipo,
            emailSent: true,
            messageId: emailResult.messageId
          }
        });

      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError);
        
        // Aún así devolver éxito para debugging
        res.json({
          success: true,
          message: 'Código generado (email falló)',
          codigo: codigo, // Para poder hacer pruebas
          debug: {
            userType: tipo,
            emailSent: false,
            emailError: emailError.message
          }
        });
      }

    } catch (error) {
      console.error('❌ Error general en enviarCodigoVerificacion:', error);
      console.error('❌ Stack:', error.stack);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        debug: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
    
    console.log('🏁 === FIN enviarCodigoVerificacion ===');
  },

  // 2. VERIFICAR CÓDIGO Y HACER LOGIN
  async verificarCodigoYLogin(req, res) {
    console.log('🚀 === INICIO verificarCodigoYLogin ===');
    
    try {
      const { correo, codigo, password } = req.body;
      console.log('📨 Request body:', { correo, codigo: codigo ? '***' + codigo.slice(-2) : 'undefined', password: password ? '***' : 'undefined' });

      if (!correo || !codigo || !password) {
        console.log('❌ Faltan parámetros requeridos');
        return res.status(400).json({
          success: false,
          message: 'Correo, código y contraseña son requeridos'
        });
      }

      // Verificar código
      console.log('🔍 Verificando código...');
      console.log('💾 Códigos en memoria:', Object.keys(verificationCodes));
      
      const codigoGuardado = verificationCodes[correo];
      
      if (!codigoGuardado) {
        console.log('❌ No hay código pendiente para este correo');
        return res.status(400).json({
          success: false,
          message: 'No hay código pendiente para este correo'
        });
      }

      console.log('🔍 Código guardado:', { 
        codigo: codigoGuardado.codigo, 
        expira: new Date(codigoGuardado.expira),
        ahora: new Date()
      });

      if (Date.now() > codigoGuardado.expira) {
        console.log('❌ Código expirado');
        delete verificationCodes[correo];
        return res.status(400).json({
          success: false,
          message: 'El código ha expirado'
        });
      }

      if (codigoGuardado.codigo !== codigo) {
        console.log('❌ Código incorrecto');
        codigoGuardado.intentos++;
        if (codigoGuardado.intentos >= 3) {
          console.log('❌ Demasiados intentos fallidos');
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

      console.log('✅ Código verificado correctamente');

      // Buscar usuario nuevamente y verificar contraseña
      console.log('🔍 Verificando credenciales...');
      const { encontrado, datos, tipo } = await buscarUsuario(correo);
      
      if (!encontrado) {
        console.log('❌ Usuario no encontrado');
        delete verificationCodes[correo];
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña
      if (datos.hashcontrasena !== password) {
        console.log('❌ Contraseña incorrecta');
        delete verificationCodes[correo];
        return res.status(401).json({
          success: false,
          message: 'Contraseña incorrecta'
        });
      }

      console.log('✅ Credenciales verificadas');

      // Limpiar código y generar token
      delete verificationCodes[correo];
      
      const token = generateJwtToken(correo, tipo);
      console.log('🔑 Token JWT generado');
      
      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token: token,
        user: datos,
        userType: tipo
      });

    } catch (error) {
      console.error('❌ Error en verificarCodigoYLogin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
    
    console.log('🏁 === FIN verificarCodigoYLogin ===');
  },

  // 3. SOLICITAR CÓDIGO PARA RECUPERAR CONTRASEÑA
  async solicitarRecuperacionPassword(req, res) {
    console.log('🚀 === INICIO solicitarRecuperacionPassword ===');
    
    try {
      const { correo } = req.body;
      console.log('📨 Correo para recuperación:', correo);

      if (!correo) {
        return res.status(400).json({
          success: false,
          message: 'Correo electrónico es requerido'
        });
      }

      // Verificar que el usuario existe
      const { encontrado, tipo } = await buscarUsuario(correo);
      
      if (!encontrado) {
        console.log('❌ Usuario no encontrado para recuperación');
        return res.status(404).json({
          success: false,
          message: 'No existe una cuenta con este correo electrónico'
        });
      }

      // Generar código
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔑 Código de recuperación generado: ${codigo}`);
      
      // Guardar en memoria con prefijo especial
      verificationCodes[`reset_${correo}`] = {
        codigo: codigo,
        expira: Date.now() + 10 * 60 * 1000,
        tipo: tipo,
        intentos: 0
      };

      // Intentar enviar email
      try {
        await sendEmail(
          correo, 
          'Recuperación de Contraseña - DeliciaSoft', 
          getEmailTemplate(codigo)
        );
        
        res.json({
          success: true,
          message: 'Código de recuperación enviado',
          codigo: codigo // SOLO PARA DESARROLLO
        });
      } catch (emailError) {
        console.error('❌ Error enviando email de recuperación:', emailError);
        
        res.json({
          success: true,
          message: 'Código generado (email falló)',
          codigo: codigo // Para poder hacer pruebas
        });
      }

    } catch (error) {
      console.error('❌ Error en recuperación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
    
    console.log('🏁 === FIN solicitarRecuperacionPassword ===');
  },

  // 4. CAMBIAR CONTRASEÑA CON CÓDIGO
  async cambiarPasswordConCodigo(req, res) {
    console.log('🚀 === INICIO cambiarPasswordConCodigo ===');
    
    try {
      const { correo, codigo, nuevaPassword } = req.body;
      console.log('📨 Cambio de contraseña para:', correo);

      if (!correo || !codigo || !nuevaPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar código de recuperación
      const codigoGuardado = verificationCodes[`reset_${correo}`];
      
      if (!codigoGuardado || codigoGuardado.codigo !== codigo || Date.now() > codigoGuardado.expira) {
        console.log('❌ Código de recuperación inválido o expirado');
        return res.status(400).json({
          success: false,
          message: 'Código inválido o expirado'
        });
      }

      console.log('✅ Código de recuperación verificado');

      // Actualizar contraseña según el tipo de usuario
      let actualizado = false;
      
      if (codigoGuardado.tipo === 'admin') {
        console.log('🔄 Actualizando contraseña en tabla usuarios');
        const result = await prisma.usuarios.updateMany({
          where: { correo, estado: true },
          data: { hashcontrasena: nuevaPassword }
        });
        actualizado = result.count > 0;
      } else {
        console.log('🔄 Actualizando contraseña en tabla cliente');
        const result = await prisma.cliente.updateMany({
          where: { correo, estado: true },
          data: { hashcontrasena: nuevaPassword }
        });
        actualizado = result.count > 0;
      }

      if (!actualizado) {
        console.log('❌ No se pudo actualizar la contraseña');
        return res.status(404).json({
          success: false,
          message: 'No se pudo actualizar la contraseña'
        });
      }

      // Limpiar código
      delete verificationCodes[`reset_${correo}`];
      console.log('✅ Contraseña actualizada exitosamente');
      
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
    
    console.log('🏁 === FIN cambiarPasswordConCodigo ===');
  },

  // 5. LOGIN DIRECTO (PARA COMPATIBILIDAD)
  async loginDirecto(req, res) {
    console.log('🚀 === INICIO loginDirecto ===');
    
    try {
      const { correo, password } = req.body;
      console.log('📨 Login directo para:', correo);

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
    
    console.log('🏁 === FIN loginDirecto ===');
  }
};