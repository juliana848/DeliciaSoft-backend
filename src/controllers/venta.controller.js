const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAll = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        detalleventa: { select: { iddetalleventa: true } },
        clienteData: { select: { idcliente: true } },
        sede: { select: { idsede: true } },
        estadoVenta: { select: { idestadoventa: true } }
      }
    });

    
    const ventasTransformadas = ventas.map(v => ({
      idventa: v.idventa,
      fechaventa: v.fechaventa,
      total: v.total,
      metodopago: v.metodopago,
      tipoventa: v.tipoventa,
      detalleventa: v.detalleventa.map(d => d.iddetalleventa), // array simple de IDs
      cliente: v.clienteData ? v.clienteData.idcliente : null, // número directo
      sede: v.sede ? v.sede.idsede : null, // número directo
      estadoVenta: v.estadoVenta ? v.estadoVenta.idestadoventa : null // número directo
    }));

    res.json(ventasTransformadas);
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
        detalleventa: { select: { iddetalle: true } },
        clienteData: { select: { idcliente: true } },
        sede: { select: { idsede: true } },
        estadoVenta: { select: { idestadoventa: true } }
      }
    });

    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });

    const ventaTransformada = {
      idventa: venta.idventa,
      fechaventa: venta.fechaventa,
      total: venta.total,
      metodopago: venta.metodopago,
      tipoventa: venta.tipoventa,
      detalleventa: venta.detalleventa.map(d => d.iddetalle),
      cliente: venta.clienteData ? { id: venta.clienteData.idcliente } : null,
      sede: venta.sede ? { id: venta.sede.idsede } : null,
      estadoVenta: venta.estadoVenta ? { id: venta.estadoVenta.idestadoventa } : null
    };

    res.json(ventaTransformada);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener venta', error: error.message });
  }
};
exports.create = async (req, res) => {
  try {
    const {
      fechaventa,
      cliente, // Este es el ID del cliente
      idsede,
      metodopago,
      tipoventa,
      estadoVentaId,
      total
    } = req.body;

    const nuevaVenta = await prisma.venta.create({
      data: {
        fechaventa: fechaventa ? new Date(fechaventa) : null,
        cliente: cliente ? { connect: { idcliente: cliente } } : undefined, // Uso de connect
        idsede,
        metodopago,
        tipoventa,
        total,
        estadoVentaId,
        estadoVenta: estadoVentaId ? { connect: { idestadoventa: estadoVentaId } } : undefined, // Uso de connect
      },
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
      cliente, // Este es el ID del cliente
      idsede,
      metodopago,
      tipoventa,
      estadoVentaId,
      total
    } = req.body;

    const ventaExiste = await prisma.venta.findUnique({ where: { idventa: id } });
    if (!ventaExiste) return res.status(404).json({ message: 'Venta no encontrada' });

    const ventaActualizada = await prisma.venta.update({
      where: { idventa: id },
      data: {
        fechaventa: fechaventa ? new Date(fechaventa) : undefined,
        cliente: cliente ? { connect: { idcliente: cliente } } : undefined,
        idsede,
        metodopago,
        tipoventa,
        total,
        estadoVentaId,
        estadoVenta: estadoVentaId ? { connect: { idestadoventa: estadoVentaId } } : undefined,
      },
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
    res.status(500).json({ message: 'Error al eliminar la venta', error: error.message });
  }
};
