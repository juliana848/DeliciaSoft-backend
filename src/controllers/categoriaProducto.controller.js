const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las categorías de producto
exports.getAll = async (req, res) => {
  try {
    const categorias = await prisma.categoriaproducto.findMany();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías de producto', error: error.message });
  }
};

// Obtener una categoría por ID
exports.getById = async (req, res) => {
  try {
    const categoria = await prisma.categoriaproducto.findUnique({
      where: { idcategoriaproducto: parseInt(req.params.id) }
    });
    if (!categoria) return res.status(404).json({ message: 'Categoría de producto no encontrada' });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la categoría de producto', error: error.message });
  }
};

// Crear nueva categoría de producto
exports.create = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    const nuevaCategoria = await prisma.categoriaproducto.create({
      data: { nombrecategoria, descripcion, estado }
    });
    res.status(201).json(nuevaCategoria);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la categoría de producto', error: error.message });
  }
};

// Actualizar categoría de producto
exports.update = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    const actualizada = await prisma.categoriaproducto.update({
      where: { idcategoriaproducto: parseInt(req.params.id) },
      data: { nombrecategoria, descripcion, estado }
    });
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la categoría de producto', error: error.message });
  }
};

// Eliminar categoría de producto
exports.remove = async (req, res) => {
  try {
    await prisma.categoriaproducto.delete({
      where: { idcategoriaproducto: parseInt(req.params.id) }
    });
    res.json({ message: 'Categoría de producto eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la categoría de producto', error: error.message });
  }
};
