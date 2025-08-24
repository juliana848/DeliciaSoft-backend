const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        detalleventa: true,
        pedido: true,
        cliente_venta_clienteTocliente: true,
        sede: true,
        estadoventa_venta_estadoventaToestadoventa: true, 
      }
    });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const venta = await prisma.venta.findUnique({
      where: { idventa: id },
      include: {
        detalleventa: true,
        pedido: true,
        cliente_venta_clienteTocliente: true,
        sede: true,
        estadoventa_venta_estadoventaToestadoventa: true,  
      }
    });
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(venta);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener venta', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      fechaventa,
      cliente,
      idsede,
      metodopago,
      tipoventa,
      estadoventa,
      total
    } = req.body;

    const nuevaVenta = await prisma.venta.create({
      data: {
        fechaventa,
        cliente,
        idsede,
        metodopago,
        tipoventa,
        total,
        estadoventa_venta_estadoventaToestadoventa: {
          connect: { idestadoventa: estadoventa }  
        }
      }
    });

    res.status(201).json(nuevaVenta);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear venta', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      fechaventa,
      cliente,
      idsede,
      metodopago,
      tipoventa,
      estadoventa,
      total
    } = req.body;

    const ventaExiste = await prisma.venta.findUnique({ where: { idventa: id } });
    if (!ventaExiste) return res.status(404).json({ message: 'Venta no encontrada' });

    const ventaActualizada = await prisma.venta.update({
      where: { idventa: id },
      data: {
        fechaventa,
        cliente,
        idsede,
        metodopago,
        tipoventa,
        total,
        estadoventa_venta_estadoventaToestadoventa: {
          connect: { idestadoventa: estadoventa }  
        }
      }
    });

    res.json(ventaActualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar venta', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const ventaExiste = await prisma.venta.findUnique({ where: { idventa: id } });
    if (!ventaExiste) return res.status(404).json({ message: 'Venta no encontrada' });

    await prisma.venta.delete({ where: { idventa: id } });
    res.json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar venta', error: error.message });
  }
};
