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
router.patch('/:id/estado', controller.toggleEstado); 
router.get('/:id/productos', controller.getProductosPorCategoria); 

module.exports = router;