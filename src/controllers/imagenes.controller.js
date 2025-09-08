require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Obtener todas las imágenes
exports.getAll = async (req, res) => {
  try {
    const imagenes = await prisma.imagenes.findMany();
    res.json(imagenes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener imágenes', error: error.message });
  }
};

// Obtener imagen por id
exports.getById = async (req, res) => {
  try {
    const imagen = await prisma.imagenes.findUnique({
      where: { idimagen: parseInt(req.params.id) }
    });
    if (!imagen) return res.status(404).json({ message: 'Imagen no encontrada' });
    res.json(imagen);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener imagen', error: error.message });
  }
};

// Subir imagen a Cloudinary y guardar url en BD
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió archivo' });
    }

    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'deliciasoft' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);

    const nuevaImagen = await prisma.imagenes.create({
      data: {
        urlimg: result.secure_url
      }
    });

    res.status(201).json(nuevaImagen);
  } catch (error) {
    res.status(500).json({ message: 'Error al subir imagen', error: error.message });
  }
};

// Guardar imagen ya subida (solo URL)
exports.saveUrl = async (req, res) => {
  try {
    const { urlimg } = req.body;
    if (!urlimg) return res.status(400).json({ message: "Falta urlimg" });

    const nuevaImagen = await prisma.imagenes.create({
      data: { urlimg }
    });

    res.status(201).json(nuevaImagen);
  } catch (error) {
    res.status(500).json({ message: "Error al guardar URL", error: error.message });
  }
};

// Actualizar url de imagen (opcional)
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { urlimg } = req.body;

    const imagenExiste = await prisma.imagenes.findUnique({ where: { idimagen: id } });
    if (!imagenExiste) return res.status(404).json({ message: 'Imagen no encontrada' });

    const actualizado = await prisma.imagenes.update({
      where: { idimagen: id },
      data: { urlimg }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar imagen', error: error.message });
  }
};

// Eliminar imagen
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const imagenExiste = await prisma.imagenes.findUnique({ where: { idimagen: id } });
    if (!imagenExiste) return res.status(404).json({ message: 'Imagen no encontrada' });

    await prisma.imagenes.delete({ where: { idimagen: id } });

    res.json({ message: 'Imagen eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar imagen', error: error.message });
  }
};
