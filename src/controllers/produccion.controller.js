const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las producciones
exports.getAll = async (req, res) => {
  try {
    const producciones = await prisma.produccion.findMany();
    res.json(producciones);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producciones', error: error.message });
  }
};

// Obtener producción por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const produccion = await prisma.produccion.findUnique({
      where: { idproduccion: id }
    });
    if (!produccion) return res.status(404).json({ message: 'Producción no encontrada' });
    res.json(produccion);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producción', error: error.message });
  }
};

// Crear producción
exports.create = async (req, res) => {
  try {
    const { fechapedido, fechaentrega, numeropedido, estadoproduccion } = req.body;

    const nuevaProduccion = await prisma.produccion.create({
      data: {
        fechapedido: fechapedido ? new Date(fechapedido) : null,
        fechaentrega: fechaentrega ? new Date(fechaentrega) : null,
        numeropedido,
        estadoproduccion
      }
    });

    res.status(201).json(nuevaProduccion);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producción', error: error.message });
  }
};

// Actualizar producción
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fechapedido, fechaentrega, numeropedido, estadoproduccion } = req.body;

    const produccionExiste = await prisma.produccion.findUnique({ where: { idproduccion: id } });
    if (!produccionExiste) return res.status(404).json({ message: 'Producción no encontrada' });

    const actualizada = await prisma.produccion.update({
      where: { idproduccion: id },
      data: {
        fechapedido: fechapedido ? new Date(fechapedido) : null,
        fechaentrega: fechaentrega ? new Date(fechaentrega) : null,
        numeropedido,
        estadoproduccion
      }
    });

    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producción', error: error.message });
  }
};

// Eliminar producción
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const produccionExiste = await prisma.produccion.findUnique({ where: { idproduccion: id } });
    if (!produccionExiste) return res.status(404).json({ message: 'Producción no encontrada' });

    await prisma.produccion.delete({ where: { idproduccion: id } });
    res.json({ message: 'Producción eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producción', error: error.message });
  }
};
