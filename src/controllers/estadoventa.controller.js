const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los estados de venta
exports.getAll = async (req, res) => {
  try {
    const estados = await prisma.estadoventa.findMany(); // ✅ nombre corregido
    res.json(estados);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los estados de venta', error: error.message });
  }
};

// Obtener un estado de venta por su ID
exports.getById = async (req, res) => {
  try {
    const estado = await prisma.estadoventa.findUnique({ // ✅ nombre corregido
      where: { idestadoventa: parseInt(req.params.id) },
    });
    if (!estado) return res.status(404).json({ message: 'Estado de venta no encontrado' });
    res.json(estado);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el estado de venta', error: error.message });
  }
};