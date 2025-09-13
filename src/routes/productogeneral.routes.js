// routes/productogeneral.js
const express = require('express');
const router = express.Router();
const productogeneralController = require('../controllers/productogeneral.controller');


router.get('/', productogeneralController.getAll);
router.get('/estadisticas', productogeneralController.getEstadisticas);
router.get('/:id', productogeneralController.getById);
router.post('/', productogeneralController.create);
router.put('/:id', productogeneralController.update);
router.delete('/:id', productogeneralController.remove);
router.patch('/:id/toggle-estado', productogeneralController.toggleEstado);

module.exports = router;