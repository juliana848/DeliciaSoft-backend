const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las recetas
exports.getAll = async (req, res) => {
  try {
    const recetas = await prisma.receta.findMany();
    res.json(recetas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener recetas', error: error.message });
  }
};

// Obtener receta por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const receta = await prisma.receta.findUnique({
      where: { idreceta: id }
    });
    if (!receta) return res.status(404).json({ message: 'Receta no encontrada' });
    res.json(receta);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener receta', error: error.message });
  }
};

// Crear receta
exports.create = async (req, res) => {
  try {
    const { nombrereceta, especificaciones } = req.body;

    const nuevaReceta = await prisma.receta.create({
      data: {
        nombrereceta,
        especificaciones
      }
    });

    res.status(201).json(nuevaReceta);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear receta', error: error.message });
  }
};

// Actualizar receta
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombrereceta, especificaciones } = req.body;

    const recetaExiste = await prisma.receta.findUnique({ where: { idreceta: id } });
    if (!recetaExiste) return res.status(404).json({ message: 'Receta no encontrada' });

    const actualizada = await prisma.receta.update({
      where: { idreceta: id },
      data: {
        nombrereceta,
        especificaciones
      }
    });

    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar receta', error: error.message });
  }
};

// Eliminar receta
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const recetaExiste = await prisma.receta.findUnique({ where: { idreceta: id } });
    if (!recetaExiste) return res.status(404).json({ message: 'Receta no encontrada' });

    await prisma.receta.delete({ where: { idreceta: id } });
    res.json({ message: 'Receta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar receta', error: error.message });
  }
};
