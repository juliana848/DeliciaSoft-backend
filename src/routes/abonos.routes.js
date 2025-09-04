const express = require('express');
const multer = require('multer');
const router = express.Router();
const abonosController = require('../controllers/abonos.controller');

// Configuración de multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    // Validar que sean solo imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El archivo es demasiado grande. Máximo 5MB.' });
    }
  }
  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({ message: error.message });
  }
  next(error);
};

// Rutas básicas CRUD
router.get('/', abonosController.getAbonos);
router.get('/:id', abonosController.getAbono);

// Crear abono (con posible imagen)
router.post('/', upload.single('comprobante'), handleMulterError, abonosController.createAbono);

// Actualizar abono (con posible imagen)
router.put('/:id', upload.single('comprobante'), handleMulterError, abonosController.updateAbono);

// Eliminar abono
router.delete('/:id', abonosController.deleteAbono);

// Obtener abonos por pedido/venta
router.get('/pedido/:idPedido', abonosController.getAbonosByPedidoId);

// Nueva ruta para anular abono
router.patch('/:id/anular', abonosController.anularAbono);

module.exports = router;