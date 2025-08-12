const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const rellenos = await prisma.catalogorelleno.findMany();
    res.json(rellenos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rellenos', error: error.message });
  }
};

// Obtener uno por ID
exports.getById = async (req, res) => {
  try {
    const relleno = await prisma.catalogorelleno.findUnique({
      where: { idrelleno: parseInt(req.params.id) }
    });
    if (!relleno) return res.status(404).json({ message: 'Relleno no encontrado' });
    res.json(relleno);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener relleno', error: error.message });
  }
};

// Crear nuevo
exports.create = async (req, res) => {
  try {
    const { nombre, precioadicion, idinsumos, estado } = req.body;
    const newRelleno = await prisma.catalogorelleno.create({
      data: { nombre, precioadicion, idinsumos, estado }
    });
    res.status(201).json(newRelleno);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear relleno', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { nombre, precioadicion, idinsumos, estado } = req.body;
    const updated = await prisma.catalogorelleno.update({
      where: { idrelleno: parseInt(req.params.id) },
      data: { nombre, precioadicion, idinsumos, estado }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar relleno', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.catalogorelleno.delete({
      where: { idrelleno: parseInt(req.params.id) }
    });
    res.json({ message: 'Relleno eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar relleno', error: error.message });
  }
};
