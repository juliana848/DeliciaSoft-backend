const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔹 Función auxiliar para formatear compra
function formatearCompra(compra) {
  if (!compra) return null;
  return {
    ...compra,
    subtotal: compra.subtotal !== null ? Number(compra.subtotal) : 0,
    iva: compra.iva !== null ? Number(compra.iva) : 0,
    total: compra.total !== null ? Number(compra.total) : 0,
    nombreProveedor: compra.proveedor?.nombre || "Proveedor desconocido",
    detallecompra: compra.detallecompra?.map(detalle => ({
      ...detalle,
      cantidad: detalle.cantidad !== null ? Number(detalle.cantidad) : 0,
      preciounitario: detalle.preciounitario !== null ? Number(detalle.preciounitario) : 0,
      subtotalproducto: detalle.subtotalproducto !== null ? Number(detalle.subtotalproducto) : 0,
      nombreInsumo: detalle.insumos?.nombreinsumo || "Insumo desconocido"
    })) || []
  };
}

// Obtener todas las compras
exports.getAll = async (req, res) => {
  try {
    const compras = await prisma.compra.findMany({
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    res.json(compras.map(formatearCompra));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener compras', error: error.message });
  }
};

// Obtener compra por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const compra = await prisma.compra.findUnique({
      where: { idcompra: id },
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    if (!compra) return res.status(404).json({ message: 'Compra no encontrada' });

    res.json(formatearCompra(compra));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la compra', error: error.message });
  }
};

// Crear nueva compra con detalle
exports.create = async (req, res) => {
  try {
    const {
      idproveedor,
      fecharegistro,
      fechacompra,
      subtotal,
      iva,
      total,
      estado,
      detallecompra
    } = req.body;

    const nuevaCompra = await prisma.compra.create({
      data: {
        idproveedor,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        fechacompra: fechacompra ? new Date(fechacompra) : null,
        subtotal: subtotal ? parseFloat(subtotal) : 0,
        iva: iva ? parseFloat(iva) : 0,
        total: total ? parseFloat(total) : 0,
        estado: estado !== undefined ? estado : true,
        detallecompra: detallecompra && detallecompra.length > 0
          ? {
              create: detallecompra.map(d => ({
                idinsumos: d.idinsumos,
                cantidad: d.cantidad ? parseFloat(d.cantidad) : 0,
                preciounitario: d.preciounitario ? parseFloat(d.preciounitario) : 0,
                subtotalproducto: d.subtotalproducto ? parseFloat(d.subtotalproducto) : 0
              }))
            }
          : undefined
      },
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    res.status(201).json(formatearCompra(nuevaCompra));
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la compra', error: error.message });
  }
};

// Sumar al total de la compra (función adicional)
exports.sumarTotal = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { monto } = req.body;

    if (monto === undefined || isNaN(monto)) {
      return res.status(400).json({ message: "Debe enviar un monto válido" });
    }

    const compraActualizada = await prisma.compra.update({
      where: { idcompra: id },
      data: {
        total: { increment: parseFloat(monto) }
      },
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    res.json(formatearCompra(compraActualizada));
  } catch (error) {
    res.status(500).json({ message: "Error al sumar al total", error: error.message });
  }
};

// Actualizar compra
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      idproveedor,
      fecharegistro,
      fechacompra,
      subtotal,
      iva,
      total,
      estado
    } = req.body;

    const compraExiste = await prisma.compra.findUnique({ where: { idcompra: id } });
    if (!compraExiste) return res.status(404).json({ message: 'Compra no encontrada' });

    const actualizada = await prisma.compra.update({
      where: { idcompra: id },
      data: {
        idproveedor,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        fechacompra: fechacompra ? new Date(fechacompra) : null,
        subtotal: subtotal !== undefined ? parseFloat(subtotal) : compraExiste.subtotal,
        iva: iva !== undefined ? parseFloat(iva) : compraExiste.iva,
        total: total !== undefined ? parseFloat(total) : compraExiste.total,
        estado: estado !== undefined ? estado : compraExiste.estado
      },
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    res.json(formatearCompra(actualizada));
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la compra', error: error.message });
  }
};

// Anular compra (cambiar estado)
exports.anular = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const compraExiste = await prisma.compra.findUnique({ where: { idcompra: id } });
    if (!compraExiste) return res.status(404).json({ message: 'Compra no encontrada' });

    const anulada = await prisma.compra.update({
      where: { idcompra: id },
      data: { estado: false },
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    res.json({ 
      message: 'Compra anulada correctamente', 
      compra: formatearCompra(anulada) 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al anular la compra', error: error.message });
  }
};

// Eliminar compra (equivalente al remove de insumos)
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const compraExiste = await prisma.compra.findUnique({ 
      where: { idcompra: id },
      include: { detallecompra: true }
    });
    
    if (!compraExiste) return res.status(404).json({ message: 'Compra no encontrada' });

    // Primero eliminar los detalles de compra
    await prisma.detalleCompra.deleteMany({
      where: { idcompra: id }
    });

    // Luego eliminar la compra
    await prisma.compra.delete({ where: { idcompra: id } });

    res.json({ message: 'Compra eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar compra', error: error.message });
  }
};

// Activar compra (función adicional para reactivar compras anuladas)
exports.activar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const compraExiste = await prisma.compra.findUnique({ where: { idcompra: id } });
    if (!compraExiste) return res.status(404).json({ message: 'Compra no encontrada' });

    const activada = await prisma.compra.update({
      where: { idcompra: id },
      data: { estado: true },
      include: {
        proveedor: true,
        detallecompra: {
          include: {
            insumos: true
          }
        }
      }
    });

    res.json({ 
      message: 'Compra activada correctamente', 
      compra: formatearCompra(activada) 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al activar la compra', error: error.message });
  }
};