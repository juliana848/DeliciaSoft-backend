const express = require('express');
const router = express.Router();
const { enviarMensajeContacto, testBrevoContacto } = require('../controllers/contacto.controller');

// Ruta para enviar mensaje de contacto (ahora con Brevo)
router.post('/enviar', enviarMensajeContacto);

// Ruta de prueba para verificar configuración de Brevo en contacto
router.post('/test-brevo', testBrevoContacto);

// Endpoint para verificar el estado del servicio de contacto
router.get('/status', (req, res) => {
  const status = {
    service: 'Contacto Service',
    provider: 'Brevo (sib-api-v3-sdk)',
    timestamp: new Date().toISOString(),
    config: {
      brevo_api_key: !!process.env.BREVO_API_KEY,
      email_user: !!process.env.EMAIL_USER,
      recaptcha_secret: !!process.env.RECAPTCHA_V2_SECRET_KEY
    },
    endpoints: {
      send_contact: '/api/contacto/enviar',
      test_brevo: '/api/contacto/test-brevo',
      status: '/api/contacto/status'
    }
  };

  // Verificar si todas las configuraciones están presentes
  const allConfigured = status.config.brevo_api_key && 
                       status.config.email_user && 
                       status.config.recaptcha_secret;

  status.ready = allConfigured;
  status.message = allConfigured 
    ? 'Servicio de contacto listo para usar con Brevo'
    : 'Configuración incompleta - revisar variables de entorno';

  res.json({
    success: true,
    status
  });
});

module.exports = router;