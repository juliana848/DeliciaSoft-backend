const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los rolpermisos
exports.getAll = async (req, res) => {
  try {
    const rolpermisos = await prisma.rolpermiso.findMany();
    res.json(rolpermisos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rolpermisos', error: error.message });
  }
};

// Obtener rolpermiso por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rolpermiso = await prisma.rolpermiso.findUnique({
      where: { idrolpermiso: id }
    });
    if (!rolpermiso) return res.status(404).json({ message: 'RolPermiso no encontrado' });
    res.json(rolpermiso);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rolpermiso', error: error.message });
  }
};

// Crear rolpermiso
exports.create = async (req, res) => {
  try {
    const { idrol, idpermiso, estado } = req.body;

    const nuevoRolPermiso = await prisma.rolpermiso.create({
      data: {
        idrol,
        idpermiso,
        estado
      }
    });

    res.status(201).json(nuevoRolPermiso);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear rolpermiso', error: error.message });
  }
};

// Actualizar rolpermiso
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { idrol, idpermiso, estado } = req.body;

    const rolpermisoExiste = await prisma.rolpermiso.findUnique({ where: { idrolpermiso: id } });
    if (!rolpermisoExiste) return res.status(404).json({ message: 'RolPermiso no encontrado' });

    const actualizado = await prisma.rolpermiso.update({
      where: { idrolpermiso: id },
      data: {
        idrol,
        idpermiso,
        estado
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rolpermiso', error: error.message });
  }
};

// Eliminar rolpermiso
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rolpermisoExiste = await prisma.rolpermiso.findUnique({ where: { idrolpermiso: id } });
    if (!rolpermisoExiste) return res.status(404).json({ message: 'RolPermiso no encontrado' });

    await prisma.rolpermiso.delete({ where: { idrolpermiso: id } });
    res.json({ message: 'RolPermiso eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar rolpermiso', error: error.message });
  }
};
