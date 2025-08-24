const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los detalles de venta
exports.getAll = async (req, res) => {
  try {
    const detalles = await prisma.detalleventa.findMany({
      include: {
        productogeneral: true, // trae info del producto
        venta: true,           // trae info de la venta
      }
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los detalles de venta', error: error.message });
  }
};

// Obtener un detalle de venta por ID
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const detalle = await prisma.detalleventa.findUnique({
      where: { iddetalleventa: id },
      include: {
        productogeneral: true,
        venta: true,
      }
    });
    if (!detalle) return res.status(404).json({ message: 'Detalle de venta no encontrado' });
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el detalle de venta', error: error.message });
  }
};

// Obtener todos los detalles de una venta específica
exports.getByVenta = async (req, res) => {
  try {
    const idVenta = parseInt(req.params.idVenta);
    const detalles = await prisma.detalleventa.findMany({
      where: { idventa: idVenta },
      include: { productogeneral: true },
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles de la venta', error: error.message });
  }
};

// Crear un detalle de venta
exports.create = async (req, res) => {
  try {
    const { idventa, idproductogeneral, cantidad, preciounitario, subtotal, iva } = req.body;
    const nuevoDetalle = await prisma.detalleventa.create({
      data: {
        idventa,
        idproductogeneral,
        cantidad,
        preciounitario,
        subtotal,
        iva,
      },
    });
    res.status(201).json(nuevoDetalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el detalle de venta', error: error.message });
  }
};

// Actualizar un detalle de venta
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { cantidad, preciounitario, subtotal, iva } = req.body;

    const detalleExiste = await prisma.detalleventa.findUnique({ where: { iddetalleventa: id } });
    if (!detalleExiste) return res.status(404).json({ message: 'Detalle de venta no encontrado' });

    const detalleActualizado = await prisma.detalleventa.update({
      where: { iddetalleventa: id },
      data: { cantidad, preciounitario, subtotal, iva },
    });
    res.json(detalleActualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el detalle de venta', error: error.message });
  }
};

// Eliminar un detalle de venta
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const detalleExiste = await prisma.detalleventa.findUnique({ where: { iddetalleventa: id } });
    if (!detalleExiste) return res.status(404).json({ message: 'Detalle de venta no encontrado' });

    await prisma.detalleventa.delete({ where: { iddetalleventa: id } });
    res.json({ message: 'Detalle de venta eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el detalle de venta', error: error.message });
  }
};
