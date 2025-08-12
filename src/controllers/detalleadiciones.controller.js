const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los registros
exports.getAll = async (req, res) => {
  try {
    const detalleAdiciones = await prisma.detalleadiciones.findMany({
      include: {
        catalogoadiciones: true,
        detalleventa: true,
        catalogorelleno: true,
        catalogosabor: true
      }
    });
    res.json(detalleAdiciones);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle adiciones', error: error.message });
  }
};

// Obtener por ID
exports.getById = async (req, res) => {
  try {
    const detalle = await prisma.detalleadiciones.findUnique({
      where: { idadicion: parseInt(req.params.id) },
      include: {
        catalogoadiciones: true,
        detalleventa: true,
        catalogorelleno: true,
        catalogosabor: true
      }
    });
    if (!detalle) return res.status(404).json({ message: 'Detalle no encontrado' });
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle', error: error.message });
  }
};

// Obtener por iddetalleventa
exports.getByDetalleVenta = async (req, res) => {
  try {
    const lista = await prisma.detalleadiciones.findMany({
      where: { iddetalleventa: parseInt(req.params.idDetalleVenta) },
      include: {
        catalogoadiciones: true,
        catalogorelleno: true,
        catalogosabor: true
      }
    });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle por venta', error: error.message });
  }
};

// Crear
exports.create = async (req, res) => {
  try {
    const { iddetalleventa, idadiciones, cantidadadicionada, preciounitario, total, idsabor, idrelleno } = req.body;
    const nuevo = await prisma.detalleadiciones.create({
      data: {
        iddetalleventa,
        idadiciones,
        cantidadadicionada,
        preciounitario,
        total,
        idsabor,
        idrelleno
      }
    });
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear detalle', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { iddetalleventa, idadiciones, cantidadadicionada, preciounitario, total, idsabor, idrelleno } = req.body;
    const actualizado = await prisma.detalleadiciones.update({
      where: { idadicion: parseInt(req.params.id) },
      data: {
        iddetalleventa,
        idadiciones,
        cantidadadicionada,
        preciounitario,
        total,
        idsabor,
        idrelleno
      }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar detalle', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.detalleadiciones.delete({
      where: { idadicion: parseInt(req.params.id) }
    });
    res.json({ message: 'Detalle eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar detalle', error: error.message });
  }
};
