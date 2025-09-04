const express = require('express');
const router = express.Router();
const controller = require('../controllers/venta.controller');

router.get('/listado-ventas-resumen', controller.getListadoResumen);
router.get('/:id/detalles', controller.getDetailsById);


router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
