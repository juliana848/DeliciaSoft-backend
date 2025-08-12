const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    const nuevaSede = await prisma.sede.create({
      data: {
        nombre,
        telefono,
        direccion,
        estado
      }
    });

    res.status(201).json(nuevaSede);
  } catch (error) {
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

    const actualizada = await prisma.sede.update({
      where: { idsede: id },
      data: {
        nombre,
        telefono,
        direccion,
        estado
      }
    });

    res.json(actualizada);
  } catch (error) {
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
