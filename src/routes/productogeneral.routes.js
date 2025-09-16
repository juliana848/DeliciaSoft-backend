const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productogeneral.controller');


router.get('/estadisticas', productosController.getEstadisticas);
router.get('/mas-vendidos', productosController.getProductosMasVendidos);
router.get('/estadisticas-ventas', productosController.getEstadisticasVentas);
router.get('/', productosController.getAll);
router.get('/:id', productosController.getById);
router.post('/', productosController.create);
router.put('/:id', productosController.update);
router.delete('/:id', productosController.remove);
router.patch('/:id/toggle-estado', productosController.toggleEstado);

module.exports = router;