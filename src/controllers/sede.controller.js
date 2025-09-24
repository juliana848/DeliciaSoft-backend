const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- NUEVO: dependencias para subir a Cloudinary ---
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

// Configura Cloudinary con tus credenciales de entorno
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// helper para subir buffer a Cloudinary
async function subirACloudinary(buffer, folder = 'sedes') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// Obtener todas las sedes
exports.getAll = async (req, res) => {
  try {
    const sedes = await prisma.sede.findMany();
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sedes', error: error.message });
  }
};

// Obtener sede por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sede = await prisma.sede.findUnique({
      where: { idsede: id }
    });
    if (!sede) return res.status(404).json({ message: 'Sede no encontrada' });
    res.json(sede);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sede', error: error.message });
  }
};

// Crear sede
exports.create = async (req, res) => {
  try {
    const { nombre, telefono, direccion, estado } = req.body;

    // Subir imagen si se envía en FormData
    let imagenUrl = null;
    if (req.file) {
      const result = await subirACloudinary(req.file.buffer);
      imagenUrl = result.secure_url;
    }

    const nuevaSede = await prisma.sede.create({
      data: {
        nombre,
        telefono,
        direccion,
        estado: estado === 'true' || estado === true,
        imagenUrl // guarda la URL de Cloudinary en la DB
      }
    });

    res.status(201).json(nuevaSede);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear sede', error: error.message });
  }
};

// Actualizar sede
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, telefono, direccion, estado } = req.body;

    const sedeExiste = await prisma.sede.findUnique({ where: { idsede: id } });
    if (!sedeExiste) return res.status(404).json({ message: 'Sede no encontrada' });

    // Mantener la URL anterior salvo que se envíe nueva imagen
    let imagenUrl = sedeExiste.imagenUrl;
    if (req.file) {
      const result = await subirACloudinary(req.file.buffer);
      imagenUrl = result.secure_url;
    }

    const actualizada = await prisma.sede.update({
      where: { idsede: id },
      data: {
        nombre,
        telefono,
        direccion,
        estado: estado === 'true' || estado === true,
        imagenUrl
      }
    });

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar sede', error: error.message });
  }
};

// Eliminar sede
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sedeExiste = await prisma.sede.findUnique({ where: { idsede: id } });
    if (!sedeExiste) return res.status(404).json({ message: 'Sede no encontrada' });

    await prisma.sede.delete({ where: { idsede: id } });
    res.json({ message: 'Sede eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar sede', error: error.message });
  }
};
