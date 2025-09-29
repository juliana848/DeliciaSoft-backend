const express = require('express');
const router = express.Router();
const controller = require('../controllers/compra.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);

// RUTAS ESPECÍFICAS PRIMERO (antes de la ruta genérica)
router.put('/:id/anular', controller.anular);
router.put('/:id/activar', controller.activar);

// RUTA GENÉRICA AL FINAL
router.put('/:id', controller.update);

module.exports = router;