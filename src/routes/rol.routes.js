const express = require('express');
const router = express.Router();
const controller = require('../controllers/rol.controller');
const permisosController = require('../controllers/permisos.controller');

// ✅ RUTAS ESPECÍFICAS PRIMERO (antes de las rutas con parámetros)
router.get('/permisos', controller.getPermisos);           // GET /api/rol/permisos
router.get('/permisos/all', permisosController.getAll);    // GET /api/rol/permisos/all

// ✅ RUTAS BÁSICAS
router.get('/', controller.getAll);
router.post('/', controller.create);

// ✅ RUTAS CON PARÁMETROS (al final)
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/estado', controller.changeState);
router.get('/:id/permisos', controller.getPermisosByRol);
router.get('/:id/usuarios', controller.getRolUsuarios);

module.exports = router;