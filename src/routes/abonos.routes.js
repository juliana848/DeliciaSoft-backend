const express = require('express');
const router = express.Router();
const abonosController = require('../controllers/abonos.controller');

router.get('/', abonosController.getAbonos);
router.get('/:id', abonosController.getAbono);
router.post('/', abonosController.createAbono);
router.put('/:id', abonosController.updateAbono);
router.delete('/:id', abonosController.deleteAbono);
router.get('/ByPedido/:idPedido', abonosController.getAbonosByPedidoId);

module.exports = router;
