const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las unidades de medida
exports.getAll = async (req, res) => {
  try {
    const unidades = await prisma.unidadmedida.findMany();
    res.json(unidades);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener unidades de medida', error: error.message });
  }
};

// Obtener unidad de medida por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const unidad = await prisma.unidadmedida.findUnique({
      where: { idunidadmedida: id }
    });
    if (!unidad) return res.status(404).json({ message: 'Unidad de medida no encontrada' });
    res.json(unidad);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener unidad de medida', error: error.message });
  }
};

// Crear unidad de medida
exports.create = async (req, res) => {
  try {
    const { unidadmedida, formademedir, equivalente } = req.body;

    const nuevaUnidad = await prisma.unidadmedida.create({
      data: {
        unidadmedida,
        formademedir,
        equivalente
      }
    });

    res.status(201).json(nuevaUnidad);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear unidad de medida', error: error.message });
  }
};

// Actualizar unidad de medida
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { unidadmedida, formademedir, equivalente } = req.body;

    const unidadExiste = await prisma.unidadmedida.findUnique({ where: { idunidadmedida: id } });
    if (!unidadExiste) return res.status(404).json({ message: 'Unidad de medida no encontrada' });

    const actualizada = await prisma.unidadmedida.update({
      where: { idunidadmedida: id },
      data: {
        unidadmedida,
        formademedir,
        equivalente
      }
    });

    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar unidad de medida', error: error.message });
  }
};

// Eliminar unidad de medida
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const unidadExiste = await prisma.unidadmedida.findUnique({ where: { idunidadmedida: id } });
    if (!unidadExiste) return res.status(404).json({ message: 'Unidad de medida no encontrada' });

    await prisma.unidadmedida.delete({ where: { idunidadmedida: id } });
    res.json({ message: 'Unidad de medida eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar unidad de medida', error: error.message });
  }
};
