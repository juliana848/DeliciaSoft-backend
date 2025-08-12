const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los permisos
exports.getAll = async (req, res) => {
  try {
    const permisos = await prisma.permisos.findMany();
    res.json(permisos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// Obtener permiso por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const permiso = await prisma.permisos.findUnique({
      where: { idpermiso: id }
    });
    if (!permiso) return res.status(404).json({ message: 'Permiso no encontrado' });
    res.json(permiso);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener permiso', error: error.message });
  }
};

// Crear permiso
exports.create = async (req, res) => {
  try {
    const { modulo, descripcion, estado } = req.body;
    const nuevoPermiso = await prisma.permisos.create({
      data: {
        modulo,
        descripcion,
        estado
      }
    });
    res.status(201).json(nuevoPermiso);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear permiso', error: error.message });
  }
};

// Actualizar permiso
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { modulo, descripcion, estado } = req.body;

    const permisoExiste = await prisma.permisos.findUnique({ where: { idpermiso: id } });
    if (!permisoExiste) return res.status(404).json({ message: 'Permiso no encontrado' });

    const actualizado = await prisma.permisos.update({
      where: { idpermiso: id },
      data: {
        modulo,
        descripcion,
        estado
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar permiso', error: error.message });
  }
};

// Eliminar permiso
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const permisoExiste = await prisma.permisos.findUnique({ where: { idpermiso: id } });
    if (!permisoExiste) return res.status(404).json({ message: 'Permiso no encontrado' });

    await prisma.permisos.delete({ where: { idpermiso: id } });
    res.json({ message: 'Permiso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar permiso', error: error.message });
  }
};
