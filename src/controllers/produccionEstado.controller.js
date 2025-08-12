const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los registros de produccion_estado
exports.getAll = async (req, res) => {
  try {
    const lista = await prisma.produccion_estado.findMany({
      include: {
        estadoproduccion: true,
        produccion: true,
      },
    });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener produccion_estado', error: error.message });
  }
};

// Obtener registro por idproduccion e idestado (composite key)
exports.getById = async (req, res) => {
  try {
    const idproduccion = parseInt(req.params.idproduccion);
    const idestado = parseInt(req.params.idestado);

    const registro = await prisma.produccion_estado.findUnique({
      where: {
        idproduccion_idestado: {
          idproduccion,
          idestado,
        },
      },
      include: {
        estadoproduccion: true,
        produccion: true,
      },
    });

    if (!registro) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json(registro);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener registro', error: error.message });
  }
};

// Crear nuevo registro
exports.create = async (req, res) => {
  try {
    const { idproduccion, idestado } = req.body;

    const nuevo = await prisma.produccion_estado.create({
      data: {
        idproduccion,
        idestado,
      },
    });

    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear registro', error: error.message });
  }
};

// Eliminar registro (por composite key)
exports.remove = async (req, res) => {
  try {
    const idproduccion = parseInt(req.params.idproduccion);
    const idestado = parseInt(req.params.idestado);

    await prisma.produccion_estado.delete({
      where: {
        idproduccion_idestado: {
          idproduccion,
          idestado,
        },
      },
    });

    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar registro', error: error.message });
  }
};
