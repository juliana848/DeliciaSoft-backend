const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');

// Rutas
router.post('/validate', clienteController.validateCliente);
router.get('/', clienteController.getClientes);
router.get('/:id', clienteController.getCliente);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
