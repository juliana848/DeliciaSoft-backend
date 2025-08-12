const express = require('express');
const router = express.Router();
const controller = require('../controllers/detallecompra.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/by-compra/:idCompra', controller.getByCompra);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
