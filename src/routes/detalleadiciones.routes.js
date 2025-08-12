const express = require('express');
const router = express.Router();
const controller = require('../controllers/detalleadiciones.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/by-detalle-venta/:idDetalleVenta', controller.getByDetalleVenta);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
