const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/venta.controller');

router.get('/listado-resumen', ventaController.getListadoResumen);

router.get('/:id/detalles', ventaController.getDetailsById);

// Rutas CRUD básicas
router.get('/', ventaController.getAll);           
router.post('/', ventaController.create);          
router.get('/:id', ventaController.getById);       
router.patch('/:id', ventaController.update);      
router.put('/:id', ventaController.update);       
router.delete('/:id', ventaController.remove);    

module.exports = router;