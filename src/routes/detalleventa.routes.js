const express = require('express');
const router = express.Router();
const controller = require('../controllers/detalleventa.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/by-venta/:idVenta', controller.getByVenta);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
