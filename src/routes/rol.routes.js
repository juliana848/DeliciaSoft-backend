const express = require('express');
const router = express.Router();
const controller = require('../controllers/rol.controller');
const permisosController = require('../controllers/permisos.controller');


// Rutas básicas
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

// Rutas adicionales que faltan
router.patch('/:id/estado', controller.changeState);
router.get('/:id/permisos', controller.getPermisosByRol);
router.get('/:id/usuarios', controller.getRolUsuarios);

// Ruta para obtener permisos (si no tienes un controlador separado)
router.get('/permisos/all', controller.getPermisos);
router.get('/permisos/all', permisosController.getAll); 

module.exports = router;