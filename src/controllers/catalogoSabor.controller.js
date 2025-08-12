const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const sabores = await prisma.catalogosabor.findMany();
    res.json(sabores);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sabores', error: error.message });
  }
};

// Obtener uno por ID
exports.getById = async (req, res) => {
  try {
    const sabor = await prisma.catalogosabor.findUnique({
      where: { idsabor: parseInt(req.params.id) }
    });
    if (!sabor) return res.status(404).json({ message: 'Sabor no encontrado' });
    res.json(sabor);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sabor', error: error.message });
  }
};

// Crear nuevo
exports.create = async (req, res) => {
  try {
    const { nombre, precioadicion, idinsumos, estado } = req.body;
    const newSabor = await prisma.catalogosabor.create({
      data: { nombre, precioadicion, idinsumos, estado }
    });
    res.status(201).json(newSabor);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear sabor', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { nombre, precioadicion, idinsumos, estado } = req.body;
    const updated = await prisma.catalogosabor.update({
      where: { idsabor: parseInt(req.params.id) },
      data: { nombre, precioadicion, idinsumos, estado }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar sabor', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.catalogosabor.delete({
      where: { idsabor: parseInt(req.params.id) }
    });
    res.json({ message: 'Sabor eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar sabor', error: error.message });
  }
};
