const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los estados de venta
exports.getAll = async (req, res) => {
  try {
    const estados = await prisma.estadoventa.findMany();
    res.json(estados);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los estados de venta', error: error.message });
  }
};

// Obtener un estado de venta por su ID
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const estado = await prisma.estadoventa.findUnique({
      where: { idestadoventa: id },
    });
    if (!estado) return res.status(404).json({ message: 'Estado de venta no encontrado' });
    res.json(estado);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el estado de venta', error: error.message });
  }
};

// Crear un nuevo estado de venta
exports.create = async (req, res) => {
  try {
    const { nombre_estado } = req.body;
    const nuevoEstado = await prisma.estadoventa.create({
      data: {
        nombre_estado,
      },
    });
    res.status(201).json(nuevoEstado);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el estado de venta', error: error.message });
  }
};

// Actualizar un estado de venta
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre_estado } = req.body;

    const estadoExiste = await prisma.estadoventa.findUnique({ where: { idestadoventa: id } });
    if (!estadoExiste) return res.status(404).json({ message: 'Estado de venta no encontrado' });

    const estadoActualizado = await prisma.estadoventa.update({
      where: { idestadoventa: id },
      data: {
        nombre_estado,
      },
    });
    res.json(estadoActualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado de venta', error: error.message });
  }
};

// Eliminar un estado de venta
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const estadoExiste = await prisma.estadoventa.findUnique({ where: { idestadoventa: id } });
    if (!estadoExiste) return res.status(404).json({ message: 'Estado de venta no encontrado' });

    await prisma.estadoventa.delete({ where: { idestadoventa: id } });
    res.json({ message: 'Estado de venta eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el estado de venta', error: error.message });
  }
};