const express = require('express');
const router = express.Router();
const controller = require('../controllers/produccionEstado.controller');

router.get('/', controller.getAll);
router.get('/:idproduccion/:idestado', controller.getById);
router.post('/', controller.create);
router.delete('/:idproduccion/:idestado', controller.remove);

module.exports = router;
