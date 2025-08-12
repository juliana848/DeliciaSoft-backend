const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const detalles = await prisma.detallecompra.findMany({
      include: {
        compra: true,
        insumos: true
      }
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle compras', error: error.message });
  }
};

// Obtener por ID
exports.getById = async (req, res) => {
  try {
    const detalle = await prisma.detallecompra.findUnique({
      where: { iddetallecompra: parseInt(req.params.id) },
      include: {
        compra: true,
        insumos: true
      }
    });
    if (!detalle) return res.status(404).json({ message: 'Detalle no encontrado' });
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle', error: error.message });
  }
};

// Obtener por idcompra
exports.getByCompra = async (req, res) => {
  try {
    const lista = await prisma.detallecompra.findMany({
      where: { idcompra: parseInt(req.params.idCompra) },
      include: {
        insumos: true
      }
    });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles por compra', error: error.message });
  }
};

// Crear
exports.create = async (req, res) => {
  try {
    const { idcompra, idinsumos, cantidad, preciounitario, subtotalproducto } = req.body;
    const nuevo = await prisma.detallecompra.create({
      data: { idcompra, idinsumos, cantidad, preciounitario, subtotalproducto }
    });
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear detalle', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { idcompra, idinsumos, cantidad, preciounitario, subtotalproducto } = req.body;
    const actualizado = await prisma.detallecompra.update({
      where: { iddetallecompra: parseInt(req.params.id) },
      data: { idcompra, idinsumos, cantidad, preciounitario, subtotalproducto }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar detalle', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.detallecompra.delete({
      where: { iddetallecompra: parseInt(req.params.id) }
    });
    res.json({ message: 'Detalle eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar detalle', error: error.message });
  }
};
