const express = require('express');
const router = express.Router();
const configuracionProductoController = require('../controllers/configuracionproducto.controller');

// Obtener todas las configuraciones
router.get('/', configuracionProductoController.getAll);

// Obtener estadísticas
router.get('/estadisticas', configuracionProductoController.getEstadisticas);

// Obtener configuración por ID de producto
router.get('/producto/:idProducto', configuracionProductoController.getByProductId);

// Crear o actualizar configuración
router.post('/', configuracionProductoController.createOrUpdate);

// Eliminar configuración
router.delete('/producto/:idProducto', configuracionProductoController.delete);

module.exports = router;