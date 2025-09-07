const express = require('express');
const router = express.Router();
const controller = require('../controllers/compra.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/anular', controller.anular);

module.exports = router;
