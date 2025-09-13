// routes/imagenes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const imagenesController = require('../controllers/imagenes.controller');

// Configuración de multer para manejar archivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    console.log('Validando archivo:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Validar tipos de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo JPG, PNG, GIF y WebP.`), false);
    }
  }
});

// Middleware personalizado para manejar ambos campos ('image' e 'imagen')
const handleFileUpload = (req, res, next) => {
  console.log('=== MIDDLEWARE DE UPLOAD ===');
  console.log('Body:', req.body);
  console.log('Headers:', req.headers['content-type']);
  
  // Configurar multer para aceptar múltiples campos
  const uploadMiddleware = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imagen', maxCount: 1 }
  ]);
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Error en multer middleware:', err);
      return next(err);
    }
    
    console.log('Files received:', req.files);
    console.log('Single file:', req.file);
    
    // Normalizar el archivo independientemente del campo usado
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        req.file = req.files.image[0];
        console.log('Usando archivo del campo "image"');
      } else if (req.files.imagen && req.files.imagen[0]) {
        req.file = req.files.imagen[0];
        console.log('Usando archivo del campo "imagen"');
      }
    }
    
    console.log('Archivo final asignado:', req.file ? 'SÍ' : 'NO');
    if (req.file) {
      console.log('Detalles del archivo:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }
    
    next();
  });
};

// Rutas de imágenes
router.get('/', imagenesController.getAll);
router.get('/estadisticas', imagenesController.getEstadisticas);
router.get('/validate-config', imagenesController.validateCloudinaryConfig);
router.get('/:id', imagenesController.getById);

// Ruta principal de upload con middleware personalizado
router.post('/upload', handleFileUpload, imagenesController.uploadImage);

// Rutas adicionales
router.post('/save-url', imagenesController.saveUrl);
router.put('/:id', imagenesController.update);
router.delete('/:id', imagenesController.remove);

// Middleware de manejo de errores de multer
router.use((error, req, res, next) => {
  console.error('Error en middleware de imágenes:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'El archivo es demasiado grande. Tamaño máximo: 10MB',
        error: 'LIMIT_FILE_SIZE'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Campo de archivo inesperado. Usa "image" o "imagen"',
        error: 'LIMIT_UNEXPECTED_FILE'
      });
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // Error genérico
  res.status(500).json({
    message: 'Error en el procesamiento del archivo',
    error: error.message
  });
});

module.exports = router;