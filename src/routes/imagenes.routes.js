const express = require('express');
const router = express.Router();
const controller = require('../controllers/imagenes.controller');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post("/url", imagenesController.saveUrl);


// Ruta para subir imagen - campo 'archivo'
router.post('/subir', upload.single('archivo'), controller.uploadImage);

module.exports = router;
