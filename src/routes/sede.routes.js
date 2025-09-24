const express = require('express');
const router = express.Router();
const controller = require('../controllers/sede.controller');

// NUEVO: multer para recibir archivos desde el frontend
const multer = require('multer');
const upload = multer(); // en memoria (no guarda en disco)

// Rutas
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Para crear y actualizar, recibimos posible archivo 'imagen'
router.post('/', upload.single('imagen'), controller.create);
router.put('/:id', upload.single('imagen'), controller.update);

router.delete('/:id', controller.remove);

module.exports = router;
