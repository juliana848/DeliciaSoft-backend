const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las categorías
exports.getAll = async (req, res) => {
  try {
    const categorias = await prisma.categoriainsumos.findMany();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
};

// Obtener una por ID
exports.getById = async (req, res) => {
  try {
    const categoria = await prisma.categoriainsumos.findUnique({
      where: { idcategoriainsumos: parseInt(req.params.id) }
    });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la categoría', error: error.message });
  }
};

// Crear nueva categoría
exports.create = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    const nuevaCategoria = await prisma.categoriainsumos.create({
      data: { nombrecategoria, descripcion, estado }
    });
    res.status(201).json(nuevaCategoria);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la categoría', error: error.message });
  }
};

// Actualizar categoría
exports.update = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    const actualizada = await prisma.categoriainsumos.update({
      where: { idcategoriainsumos: parseInt(req.params.id) },
      data: { nombrecategoria, descripcion, estado }
    });
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la categoría', error: error.message });
  }
};

// Eliminar categoría
exports.remove = async (req, res) => {
  try {
    await prisma.categoriainsumos.delete({
      where: { idcategoriainsumos: parseInt(req.params.id) }
    });
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la categoría', error: error.message });
  }
};
