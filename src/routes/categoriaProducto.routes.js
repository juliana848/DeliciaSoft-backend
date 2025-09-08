const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoriaProducto.controller');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    // Validar tipo de archivo
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Rutas básicas CRUD
router.get('/', controller.getAll);
router.get('/activas', controller.getActive); 
router.get('/:id', controller.getById);

router.post('/', upload.single('imagen'), controller.create);
router.put('/:id', upload.single('imagen'), controller.update);

router.delete('/:id', controller.remove);
router.post('/test-cloudinary', upload.single('imagen'), controller.testCloudinary);
router.get('/debug/cloudinary', controller.debugCloudinary);
router.patch('/:id/estado', controller.toggleEstado); 
router.get('/:id/productos', controller.getProductosPorCategoria); 

// Agregar este endpoint temporal en tu categoriaProducto.routes.js para hacer debug

// Ruta de debug para verificar configuración de Cloudinary
router.get('/debug/cloudinary-config', (req, res) => {
  try {
    console.log('=== DEBUG CLOUDINARY CONFIGURATION ===');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado' : 'NO CONFIGURADO');
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Configurado' : 'NO CONFIGURADO');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Configurado' : 'NO CONFIGURADO');
    
    // Mostrar primeros caracteres para verificar si son correctos (sin mostrar toda la clave)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('Cloud Name starts with:', process.env.CLOUDINARY_CLOUD_NAME.substring(0, 5) + '...');
    }
    if (process.env.CLOUDINARY_API_KEY) {
      console.log('API Key starts with:', process.env.CLOUDINARY_API_KEY.substring(0, 5) + '...');
    }
    if (process.env.CLOUDINARY_API_SECRET) {
      console.log('API Secret starts with:', process.env.CLOUDINARY_API_SECRET.substring(0, 5) + '...');
    }
    
    res.json({
      message: 'Configuración verificada - revisa logs del servidor',
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });
  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// También mejora la función uploadToCloudinary para más debugging:
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    console.log('=== UPLOAD TO CLOUDINARY DEBUG ===');
    console.log('Buffer recibido, tamaño:', fileBuffer ? fileBuffer.length : 'null');
    
    // Verificar que tenemos el buffer
    if (!fileBuffer) {
      console.error('❌ No se recibió buffer de archivo');
      return reject(new Error('No se recibió buffer de archivo'));
    }

    // Verificar configuración de Cloudinary con más detalle
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    };

    console.log('🔍 Verificando configuración:');
    console.log('- Cloud Name:', config.cloud_name ? '✅ Configurado' : '❌ FALTA');
    console.log('- API Key:', config.api_key ? '✅ Configurado' : '❌ FALTA');
    console.log('- API Secret:', config.api_secret ? '✅ Configurado' : '❌ FALTA');

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      const error = new Error('Variables de entorno de Cloudinary no configuradas completamente');
      console.error('❌', error.message);
      return reject(error);
    }

    // Verificar que la configuración esté aplicada correctamente
    console.log('🔧 Configuración actual de Cloudinary:');
    console.log('- Cloud Name en config:', cloudinary.config().cloud_name);
    console.log('- API Key en config:', cloudinary.config().api_key);
    
    console.log('📤 Iniciando upload stream...');
    
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'deliciasoft/categorias',
        resource_type: 'image',
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('❌ Error en Cloudinary:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          reject(error);
        } else {
          console.log('✅ Imagen subida exitosamente a Cloudinary');
          console.log('🔗 URL generada:', result.secure_url);
          console.log('📄 Public ID:', result.public_id);
          resolve(result);
        }
      }
    );

    try {
      console.log('📝 Escribiendo buffer al stream...');
      stream.write(fileBuffer);
      stream.end();
      console.log('✅ Buffer enviado correctamente');
    } catch (streamError) {
      console.error('❌ Error al escribir al stream:', streamError);
      reject(streamError);
    }
  });
};

module.exports = router;