const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las ventas
exports.getAll = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        detalleventa: { select: { iddetalleventa: true } },
        clienteData: { select: { idcliente: true } },
        sede: { select: { idsede: true } },
        estadoVenta: { select: { idestadoventa: true, nombre: true } }
      }
    });

    const ventasTransformadas = ventas.map(v => ({
      idventa: v.idventa,
      fechaventa: v.fechaventa,
      total: v.total,
      metodopago: v.metodopago,
      tipoventa: v.tipoventa,
      detalleventa: v.detalleventa.map(d => d.iddetalleventa),
      cliente: v.clienteData ? v.clienteData.idcliente : null,
      sede: v.sede ? v.sede.idsede : null,
      estadoVenta: v.estadoVenta
        ? { id: v.estadoVenta.idestadoventa, nombre: v.estadoVenta.nombre }
        : null
    }));

    res.json(ventasTransformadas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
  }
};

// Obtener una venta por ID
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const venta = await prisma.venta.findUnique({
      where: { idventa: id },
      include: {
        detalleventa: { select: { iddetalleventa: true } },
        clienteData: { select: { idcliente: true } },
        sede: { select: { idsede: true } },
        estadoVenta: { select: { idestadoventa: true, nombre: true } }
      }
    });

    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });

    const ventaTransformada = {
      idventa: venta.idventa,
      fechaventa: venta.fechaventa,
      total: venta.total,
      metodopago: venta.metodopago,
      tipoventa: venta.tipoventa,
      detalleventa: venta.detalleventa.map(d => d.iddetalleventa),
      cliente: venta.clienteData ? venta.clienteData.idcliente : null,
      sede: venta.sede ? venta.sede.idsede : null,
      estadoVenta: venta.estadoVenta
        ? { id: venta.estadoVenta.idestadoventa, nombre: venta.estadoVenta.nombre }
        : null
    };

    res.json(ventaTransformada);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener venta', error: error.message });
  }
};

// Crear una venta
exports.create = async (req, res) => {
  try {
    const { fechaventa, cliente, idsede, metodopago, tipoventa, estadoVentaId, total, detalleventa } = req.body;

    const nuevaVenta = await prisma.venta.create({
      data: {
        fechaventa,
        metodopago,
        tipoventa,
        total,
        clienteData: cliente ? { connect: { idcliente: cliente } } : undefined,
        sede: idsede ? { connect: { idsede: idsede } } : undefined,
        estadoVenta: estadoVentaId ? { connect: { idestadoventa: estadoVentaId } } : undefined,
        detalleventa: detalleventa && detalleventa.length > 0
          ? { connect: detalleventa.map(id => ({ iddetalleventa: id })) }
          : undefined
      },
      include: {
        clienteData: true,
        sede: true,
        estadoVenta: true,
        detalleventa: true
      }
    });

    res.status(201).json(nuevaVenta);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear venta', error: error.message });
  }
};

// Actualizar una venta
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fechaventa, cliente, idsede, metodopago, tipoventa, estadoVentaId, total, detalleventa } = req.body;

    const ventaExiste = await prisma.venta.findUnique({ where: { idventa: id } });
    if (!ventaExiste) return res.status(404).json({ message: 'Venta no encontrada' });

    const ventaActualizada = await prisma.venta.update({
      where: { idventa: id },
      data: {
        fechaventa,
        metodopago,
        tipoventa,
        total,
        clienteData: cliente ? { connect: { idcliente: cliente } } : undefined,
        sede: idsede ? { connect: { idsede: idsede } } : undefined,
        estadoVenta: estadoVentaId ? { connect: { idestadoventa: estadoVentaId } } : undefined,
        detalleventa: detalleventa && detalleventa.length > 0
          ? { set: detalleventa.map(id => ({ iddetalleventa: id })) }
          : undefined
      },
      include: {
        clienteData: true,
        sede: true,
        estadoVenta: true,
        detalleventa: true
      }
    });

    res.json(ventaActualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar venta', error: error.message });
  }
};

// Cambiar solo el estado de una venta
exports.updateEstado = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estadoVentaId } = req.body;

    const ventaExiste = await prisma.venta.findUnique({ where: { idventa: id } });
    if (!ventaExiste) return res.status(404).json({ message: "Venta no encontrada" });

    const ventaActualizada = await prisma.venta.update({
      where: { idventa: id },
      data: {
        estadoVenta: estadoVentaId
          ? { connect: { idestadoventa: estadoVentaId } }
          : undefined
      },
      include: {
        estadoVenta: true
      }
    });

    res.json({
      message: "Estado actualizado correctamente",
      idventa: ventaActualizada.idventa,
      estadoVenta: ventaActualizada.estadoVenta
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar estado de la venta", error: error.message });
  }
};

// Eliminar una venta
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
