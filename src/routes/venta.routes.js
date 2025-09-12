const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/venta.controller');

router.get('/listado-resumen', ventaController.getListadoResumen);

router.get('/:id/detalles', ventaController.getDetailsWithAbonos);

// Rutas CRUD básicas
router.get('/', ventaController.getAll);
router.get('/:id', ventaController.getById);
router.post('/', ventaController.create);
router.put('/:id', ventaController.update);
router.patch('/:id', ventaController.update); 
router.delete('/:id', ventaController.remove);

module.exports = router;