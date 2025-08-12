const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const adiciones = await prisma.catalogoadiciones.findMany();
    res.json(adiciones);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener adiciones', error: error.message });
  }
};

// Obtener uno por ID
exports.getById = async (req, res) => {
  try {
    const adicion = await prisma.catalogoadiciones.findUnique({
      where: { idadiciones: parseInt(req.params.id) }
    });
    if (!adicion) return res.status(404).json({ message: 'Adición no encontrada' });
    res.json(adicion);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la adición', error: error.message });
  }
};

// Crear nuevo
exports.create = async (req, res) => {
  try {
    const { idinsumos, nombre, precioadicion, estado } = req.body;
    const newAdicion = await prisma.catalogoadiciones.create({
      data: { idinsumos, nombre, precioadicion, estado }
    });
    res.status(201).json(newAdicion);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la adición', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { idinsumos, nombre, precioadicion, estado } = req.body;
    const updated = await prisma.catalogoadiciones.update({
      where: { idadiciones: parseInt(req.params.id) },
      data: { idinsumos, nombre, precioadicion, estado }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la adición', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.catalogoadiciones.delete({
      where: { idadiciones: parseInt(req.params.id) }
    });
    res.json({ message: 'Adición eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la adición', error: error.message });
  }
};
