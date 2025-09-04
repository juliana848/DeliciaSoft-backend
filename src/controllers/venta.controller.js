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

// NUEVA FUNCION para obtener el listado resumen de ventas
exports.getListadoResumen = async (req, res) => {
    try {
        const ventas = await prisma.venta.findMany({
            select: {
                idventa: true,
                fechaventa: true,
                total: true,
                metodopago: true,
                tipoventa: true,
                estadoVentaId: true,
                clienteData: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                },
                sede: {
                    select: {
                        nombre: true
                    }
                },
                estadoVenta: {
                    select: {
                        nombre_estado: true
                    }
                }
            }
        });

        const ventasTransformadas = ventas.map(venta => ({
            idventa: venta.idventa,
            fechaventa: venta.fechaventa,
            total: parseFloat(venta.total),
            metodopago: venta.metodopago,
            tipoventa: venta.tipoventa,
            idestadoventa: venta.estadoVentaId,
            nombreEstado: venta.estadoVenta?.nombre_estado || 'N/A',
            nombreCliente: venta.clienteData ? `${venta.clienteData.nombre} ${venta.clienteData.apellido}` : 'N/A',
            nombreSede: venta.sede?.nombre || 'N/A'
        }));

        res.json(ventasTransformadas);
    } catch (error) {
        console.error('Error en getListadoResumen:', error);
        res.status(500).json({ message: 'Error al obtener el listado de ventas.', error: error.message });
    }
};

// FUNCION para obtener el detalle completo de una venta
exports.getDetailsById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const venta = await prisma.venta.findUnique({
            where: { idventa: id },
            include: {
                clienteData: true,
                sede: true,
                estadoVenta: true,
                detalleventa: {
                    include: {
                        productoGeneral: true,
                        adiciones: {
                            include: {
                                catalogoAdiciones: true
                            }
                        },
                        salsas: {
                            include: {
                                catalogoSalsa: true
                            }
                        },
                        sabores: {
                            include: {
                                catalogoSabor: true
                            }
                        }
                    }
                },
                abonos: true
            }
        });

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada.' });
        }

        res.json(venta);
    } catch (error) {
        console.error('Error en getDetailsById:', error);
        res.status(500).json({ message: 'Error al obtener el detalle de la venta.', error: error.message });
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
      estadoVentaId,
      total,
      detalleventa
    } = req.body;

    const nuevaVenta = await prisma.venta.create({
      data: {
        fechaventa: new Date(fechaventa),
        cliente,
        idsede,
        metodopago,
        tipoventa,
        estadoVentaId,
        total,
        detalleventa: {
          createMany: {
            data: detalleventa
          }
        }
      },
    });
    res.status(201).json(nuevaVenta);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear venta', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const venta = await prisma.venta.findUnique({ where: { idventa: id } });
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(venta);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener venta', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await prisma.venta.update({
      where: { idventa: id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar venta', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.venta.delete({ where: { idventa: id } });
    res.json({ message: 'Venta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar venta', error: error.message });
  }
};
