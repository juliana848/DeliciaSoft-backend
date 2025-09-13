const express = require('express');
const router = express.Router();
const controller = require('../controllers/receta.controller');

// routes/recetas.js
router.get('/recetas', recetaController.getAll);
router.get('/recetas/:id', recetaController.getById);
router.post('/recetas', recetaController.create);
router.put('/recetas/:id', recetaController.update);
router.delete('/recetas/:id', recetaController.remove);
router.get('/recetas/search', recetaController.search);
router.get('/recetas/estadisticas', recetaController.getEstadisticas);

// Rutas para detalles de receta
router.get('/detalle-recetas/receta/:idReceta', recetaController.getDetallesByReceta);
router.post('/detalle-recetas', recetaController.createDetalle);
router.delete('/detalle-recetas/receta/:idReceta', recetaController.removeDetallesByReceta);

module.exports = router;
