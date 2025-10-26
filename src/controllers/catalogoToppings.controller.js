const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const toppings = await prisma.catalogotoppings.findMany();
    res.json(toppings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener toppings ', error: error.message });
  }
};

// Obtener uno por ID
exports.getById = async (req, res) => {
  try {
    const toppings = await prisma.catalogotoppings.findUnique({
      where: { idtoppings: parseInt(req.params.id) }
    });
    if (!toppings) return res.status(404).json({ message: 'topping no encontrado' });
    res.json(toppings);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener topping', error: error.message });
  }
};

// Crear nuevo
exports.create = async (req, res) => {
  try {
    const { idinsumos, nombre, precioadicion, estado } = req.body;
    const newTopping = await prisma.catalogotoppings.create({
      data: { idinsumos, nombre, precioadicion, estado }
    });
    res.status(201).json(newTopping);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear topping', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { idinsumos, nombre, precioadicion, estado } = req.body;
    const updated = await prisma.catalogotoppings.update({
      where: { idtoppings: parseInt(req.params.id) },
      data: { idinsumos, nombre, precioadicion, estado }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar topping', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.catalogotoppings.delete({
      where: { idtoppings : parseInt(req.params.id) }
    });
    res.json({ message: 'Topping eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar topping', error: error.message });
  }
};
