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
    // Validar tipos de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG y GIF.'), false);
    }
  }
});

// Rutas de imágenes
router.get('/', imagenesController.getAll);
router.get('/estadisticas', imagenesController.getEstadisticas);
router.get('/validate-config', imagenesController.validateCloudinaryConfig);
router.get('/:id', imagenesController.getById);
router.post('/upload', upload.single('image'), imagenesController.uploadImage);
router.post('/save-url', imagenesController.saveUrl);
router.put('/:id', imagenesController.update);
router.delete('/:id', imagenesController.remove);

// Middleware de manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'El archivo es demasiado grande. Tamaño máximo: 10MB',
      });
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      message: error.message,
    });
  }
  
  next(error);
});

module.exports = router;