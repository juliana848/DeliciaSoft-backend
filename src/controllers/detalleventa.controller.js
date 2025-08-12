const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los detalles de venta
exports.getAll = async (req, res) => {
  try {
    const detalles = await prisma.detalleventa.findMany({
      include: {
        productogeneral: true,
        venta: true
      }
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los detalles de venta', error: error.message });
  }
};

// Obtener detalle de venta por id
exports.getById = async (req, res) => {
  try {
    const detalle = await prisma.detalleventa.findUnique({
      where: { iddetalleventa: parseInt(req.params.id) },
      include: {
        productogeneral: true,
        venta: true
      }
    });
    if (!detalle) return res.status(404).json({ message: 'Detalle no encontrado' });
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle de venta', error: error.message });
  }
};

// Obtener detalles por idventa
exports.getByVenta = async (req, res) => {
  try {
    const detalles = await prisma.detalleventa.findMany({
      where: { idventa: parseInt(req.params.idVenta) },
      include: {
        productogeneral: true
      }
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles por venta', error: error.message });
  }
};

// Crear nuevo detalle de venta
exports.create = async (req, res) => {
  try {
    const { idventa, idproductogeneral, cantidad, preciounitario, subtotal, iva } = req.body;
    const nuevo = await prisma.detalleventa.create({
      data: {
        idventa,
        idproductogeneral,
        cantidad,
        preciounitario,
        subtotal,
        iva
      }
    });
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear detalle de venta', error: error.message });
  }
};

// Actualizar detalle de venta
exports.update = async (req, res) => {
  try {
    const { idventa, idproductogeneral, cantidad, preciounitario, subtotal, iva } = req.body;
    const actualizado = await prisma.detalleventa.update({
      where: { iddetalleventa: parseInt(req.params.id) },
      data: {
        idventa,
        idproductogeneral,
        cantidad,
        preciounitario,
        subtotal,
        iva
      }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar detalle de venta', error: error.message });
  }
};

// Eliminar detalle de venta
exports.remove = async (req, res) => {
  try {
    await prisma.detalleventa.delete({
      where: { iddetalleventa: parseInt(req.params.id) }
    });
    res.json({ message: 'Detalle de venta eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar detalle de venta', error: error.message });
  }
};
