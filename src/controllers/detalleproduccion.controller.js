const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const detalles = await prisma.detalleproduccion.findMany({
      include: {
        produccion: true,
        productogeneral: true
      }
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles de producción', error: error.message });
  }
};

// Obtener por ID
exports.getById = async (req, res) => {
  try {
    const detalle = await prisma.detalleproduccion.findUnique({
      where: { iddetalleproduccion: parseInt(req.params.id) },
      include: {
        produccion: true,
        productogeneral: true
      }
    });
    if (!detalle) return res.status(404).json({ message: 'Detalle no encontrado' });
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle', error: error.message });
  }
};

// Obtener por idproduccion
exports.getByProduccion = async (req, res) => {
  try {
    const lista = await prisma.detalleproduccion.findMany({
      where: { idproduccion: parseInt(req.params.idProduccion) },
      include: {
        productogeneral: true
      }
    });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles por producción', error: error.message });
  }
};

// Crear
exports.create = async (req, res) => {
  try {
    const { idproductogeneral, idproduccion, cantidadproducto } = req.body;
    const nuevo = await prisma.detalleproduccion.create({
      data: { idproductogeneral, idproduccion, cantidadproducto }
    });
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear detalle de producción', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { idproductogeneral, idproduccion, cantidadproducto } = req.body;
    const actualizado = await prisma.detalleproduccion.update({
      where: { iddetalleproduccion: parseInt(req.params.id) },
      data: { idproductogeneral, idproduccion, cantidadproducto }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar detalle de producción', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.detalleproduccion.delete({
      where: { iddetalleproduccion: parseInt(req.params.id) }
    });
    res.json({ message: 'Detalle de producción eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar detalle', error: error.message });
  }
};
