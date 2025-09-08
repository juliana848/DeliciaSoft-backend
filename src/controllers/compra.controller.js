const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las compras
exports.getAll = async (req, res) => {
  try {
    const compras = await prisma.compra.findMany({
      include: { proveedor: true, detallecompra: true }
    });
    res.json(compras);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener compras', error: error.message });
  }
};
// Obtener una compra por ID
exports.getById = async (req, res) => {
  try {
    const compra = await prisma.compra.findUnique({
      where: { idcompra: parseInt(req.params.id) },
      include: {
        proveedor: true, 
        detallecompra: {
          include: {
            insumos: true, 
          },
        },
      },
    });
    if (!compra) return res.status(404).json({ message: 'Compra no encontrada' });
    res.json(compra);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la compra', error: error.message });
  }
};

// Crear nueva compra
// exports.create = async (req, res) => {
//   try {
//     const { idproveedor, fecharegistro, fechacompra, subtotal, iva, total } = req.body;
//     const nuevaCompra = await prisma.compra.create({
//       data: {
//         idproveedor,
//         fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
//         fechacompra: fechacompra ? new Date(fechacompra) : null,
//         subtotal,
//         iva,
//         total
//       }
//     });
//     res.status(201).json(nuevaCompra);
//   } catch (error) {
//     res.status(500).json({ message: 'Error al crear la compra', error: error.message });
//   }
// };

// Crear nueva compra con detalle
exports.create = async (req, res) => {
  try {
    const { idproveedor, fecharegistro, fechacompra, subtotal, iva, total, detallecompra } = req.body;

    const nuevaCompra = await prisma.compra.create({
      data: {
        idproveedor,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        fechacompra: fechacompra ? new Date(fechacompra) : null,
        subtotal,
        iva,
        total,
        detallecompra: detallecompra && detallecompra.length > 0
          ? {
              create: detallecompra.map(d => ({
                idinsumos: d.idinsumos,
                cantidad: d.cantidad,
                preciounitario: d.preciounitario,
                subtotalproducto: d.subtotalproducto
              }))
            }
          : undefined
      },
      include: {
        proveedor: true,
        detallecompra: { include: { insumos: true } }
      }
    });

    res.status(201).json(nuevaCompra);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la compra', error: error.message });
  }
};

// Actualizar compra
exports.update = async (req, res) => {
  try {
    const { idproveedor, fecharegistro, fechacompra, subtotal, iva, total } = req.body;
    const actualizada = await prisma.compra.update({
      where: { idcompra: parseInt(req.params.id) },
      data: {
        idproveedor,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        fechacompra: fechacompra ? new Date(fechacompra) : null,
        subtotal,
        iva,
        total
      }
    });
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la compra', error: error.message });
  }
};

// Anular compra (cambiar estado)
exports.anular = async (req, res) => {
  try {
    const anulada = await prisma.compra.update({
      where: { idcompra: parseInt(req.params.id) },
      data: { estado: false }
    });
    res.json({ message: 'Compra anulada correctamente', anulada });
  } catch (error) {
    res.status(500).json({ message: 'Error al anular la compra', error: error.message });
  }
};
