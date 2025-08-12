const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos
exports.getAll = async (req, res) => {
  try {
    const detalles = await prisma.detallereceta.findMany({
      include: {
        insumos: true,
        receta: true,
        unidadmedida: true
      }
    });
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los detalles de receta', error: error.message });
  }
};

// Obtener por ID
exports.getById = async (req, res) => {
  try {
    const detalle = await prisma.detallereceta.findUnique({
      where: { iddetallereceta: parseInt(req.params.id) },
      include: {
        insumos: true,
        receta: true,
        unidadmedida: true
      }
    });
    if (!detalle) return res.status(404).json({ message: 'Detalle no encontrado' });
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el detalle', error: error.message });
  }
};

// Obtener por idreceta
exports.getByReceta = async (req, res) => {
  try {
    const lista = await prisma.detallereceta.findMany({
      where: { idreceta: parseInt(req.params.idReceta) },
      include: {
        insumos: true,
        unidadmedida: true
      }
    });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalles por receta', error: error.message });
  }
};

// Crear
exports.create = async (req, res) => {
  try {
    const { idreceta, idinsumo, idunidadmedida, cantidad } = req.body;
    const nuevo = await prisma.detallereceta.create({
      data: { idreceta, idinsumo, idunidadmedida, cantidad }
    });
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear detalle de receta', error: error.message });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { idreceta, idinsumo, idunidadmedida, cantidad } = req.body;
    const actualizado = await prisma.detallereceta.update({
      where: { iddetallereceta: parseInt(req.params.id) },
      data: { idreceta, idinsumo, idunidadmedida, cantidad }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar detalle de receta', error: error.message });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    await prisma.detallereceta.delete({
      where: { iddetallereceta: parseInt(req.params.id) }
    });
    res.json({ message: 'Detalle de receta eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar detalle de receta', error: error.message });
  }
};
