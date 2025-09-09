const express = require('express');
const router = express.Router();
const permisosController = require('../controllers/permisos.controller');

// Rutas para permisos
router.get('/', permisosController.getAll);           // GET /api/permisos
router.get('/:id', permisosController.getById);       // GET /api/permisos/:id
router.post('/', permisosController.create);          // POST /api/permisos
router.put('/:id', permisosController.update);        // PUT /api/permisos/:id
router.delete('/:id', permisosController.remove);     // DELETE /api/permisos/:id

module.exports = router;