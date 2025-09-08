const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoriaProducto.controller');

// Rutas básicas CRUD
router.get('/', controller.getAll);
router.get('/activas', controller.getActive); 
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

// Nuevas rutas adicionales
router.patch('/:id/estado', controller.toggleEstado); 
router.get('/:id/productos', controller.getProductosPorCategoria); 

module.exports = router;