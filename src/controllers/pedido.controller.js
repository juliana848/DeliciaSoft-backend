const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los pedidos (incluyendo la relación con venta)
exports.getAll = async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: {
        venta: true
      }
    });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedidos', error: error.message });
  }
};

// Obtener pedido por id (incluyendo venta)
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pedido = await prisma.pedido.findUnique({
      where: { idpedido: id },
      include: { venta: true }
    });
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedido', error: error.message });
  }
};

// Crear nuevo pedido
exports.create = async (req, res) => {
  try {
    const {
      idventa,
      observaciones,
      fechaentrega,
    } = req.body;

    const nuevoPedido = await prisma.pedido.create({
      data: {
        idventa,
        observaciones,
        fechaentrega: fechaentrega ? new Date(fechaentrega) : null,
      }
    });

    res.status(201).json(nuevoPedido);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear pedido', error: error.message });
  }
};

// Actualizar pedido
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      idventa,
      observaciones,
      fechaentrega,
    } = req.body;

    const pedidoExiste = await prisma.pedido.findUnique({ where: { idpedido: id } });
    if (!pedidoExiste) return res.status(404).json({ message: 'Pedido no encontrado' });

    const actualizado = await prisma.pedido.update({
      where: { idpedido: id },
      data: {
        idventa,
        observaciones,
        fechaentrega: fechaentrega ? new Date(fechaentrega) : null,
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar pedido', error: error.message });
  }
};

// Eliminar pedido
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pedidoExiste = await prisma.pedido.findUnique({ where: { idpedido: id } });
    if (!pedidoExiste) return res.status(404).json({ message: 'Pedido no encontrado' });

    await prisma.pedido.delete({ where: { idpedido: id } });
    res.json({ message: 'Pedido eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar pedido', error: error.message });
  }
};
