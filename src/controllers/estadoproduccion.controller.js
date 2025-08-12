const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los estados de producción
exports.getAll = async (req, res) => {
  try {
    const estados = await prisma.estadoproduccion.findMany();
    res.json(estados);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estados de producción', error: error.message });
  }
};

// Obtener estado de producción por id
exports.getById = async (req, res) => {
  try {
    const estado = await prisma.estadoproduccion.findUnique({
      where: { idestado: parseInt(req.params.id) }
    });
    if (!estado) return res.status(404).json({ message: 'Estado no encontrado' });
    res.json(estado);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estado de producción', error: error.message });
  }
};

// Crear nuevo estado de producción
exports.create = async (req, res) => {
  try {
    const { nombreestado } = req.body;
    const nuevoEstado = await prisma.estadoproduccion.create({
      data: { nombreestado }
    });
    res.status(201).json(nuevoEstado);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear estado de producción', error: error.message });
  }
};

// Actualizar estado de producción
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombreestado } = req.body;

    // Verificar existencia
    const estadoExiste = await prisma.estadoproduccion.findUnique({ where: { idestado: id } });
    if (!estadoExiste) return res.status(404).json({ message: 'Estado no encontrado' });

    const actualizado = await prisma.estadoproduccion.update({
      where: { idestado: id },
      data: { nombreestado }
    });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado de producción', error: error.message });
  }
};

// Eliminar estado de producción
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const estadoExiste = await prisma.estadoproduccion.findUnique({ where: { idestado: id } });
    if (!estadoExiste) return res.status(404).json({ message: 'Estado no encontrado' });

    await prisma.estadoproduccion.delete({ where: { idestado: id } });
    res.json({ message: 'Estado de producción eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar estado de producción', error: error.message });
  }
};
