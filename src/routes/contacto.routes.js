const express = require('express');
const router = express.Router();
const { enviarMensajeContacto } = require('../controllers/contacto.controller');

// Ruta para enviar mensaje de contacto
router.post('/enviar', enviarMensajeContacto);

module.exports = router;