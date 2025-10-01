// routes/inventariosede.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventariosede.controller');

// Obtener inventario general de todos los productos en todas las sedes
router.get('/general', controller.getInventarioGeneral);

// Obtener inventario disponible de una sede específica (para ventas)
router.get('/sede/:idsede', controller.getInventarioPorSede);

// Obtener inventario de un producto específico en todas las sedes
router.get('/producto/:idproductogeneral', controller.getInventarioProducto);

// Obtener inventario de un producto en una sede específica (query params)
router.get('/', controller.getInventarioBySede);

// Actualizar/crear inventario manualmente
router.post('/', controller.actualizarInventario);

module.exports = router;