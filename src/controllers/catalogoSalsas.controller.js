const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const salsas = await prisma.catalogosalsas.findMany();
    res.json(salsas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener salsa', error: error.message });
  }
};

// Obtener uno por ID
exports.getById = async (req, res) => {
  try {
    const salsas = await prisma.catalogosalsas.findUnique({
      where: { idsalsa: parseInt(req.params.id) }
    });
    if (!salsas) return res.status(404).json({ message: 'Salsa no encontrado' });
    res.json(salsas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener salsa', error: error.message });
  }
};

// Crear nuevo
exports.create = async (req, res) => {
  try {
    const { nombre, precioadicion, idinsumos, estado } = req.body;
    const newsalsas = await prisma.catalogosalsas.create({
      data: { nombre, precioadicion, idinsumos, estado }
    });
    res.status(201).json(newsalsas);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear salsa', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { nombre, precioadicion, idinsumos, estado } = req.body;
    const updated = await prisma.catalogosalsas.update({
      where: { idsalsa: parseInt(req.params.id) },
      data: { nombre, precioadicion, idinsumos, estado }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar salsa', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.catalogosalsas.delete({
      where: { idsalsa: parseInt(req.params.id) }
    });
    res.json({ message: 'Salsa eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la salsa', error: error.message });
  }
};
