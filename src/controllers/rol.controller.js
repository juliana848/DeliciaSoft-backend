const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los roles
exports.getAll = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener roles', error: error.message });
  }
};

// Obtener rol por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rol = await prisma.rol.findUnique({
      where: { idrol: id }
    });
    if (!rol) return res.status(404).json({ message: 'Rol no encontrado' });
    res.json(rol);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rol', error: error.message });
  }
};

// Crear rol
exports.create = async (req, res) => {
  try {
    const { rol, descripcion, estado } = req.body;

    const nuevoRol = await prisma.rol.create({
      data: {
        rol,
        descripcion,
        estado
      }
    });

    res.status(201).json(nuevoRol);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear rol', error: error.message });
  }
};

// Actualizar rol
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rol, descripcion, estado } = req.body;

    const rolExiste = await prisma.rol.findUnique({ where: { idrol: id } });
    if (!rolExiste) return res.status(404).json({ message: 'Rol no encontrado' });

    const actualizado = await prisma.rol.update({
      where: { idrol: id },
      data: {
        rol,
        descripcion,
        estado
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
};

// Eliminar rol
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rolExiste = await prisma.rol.findUnique({ where: { idrol: id } });
    if (!rolExiste) return res.status(404).json({ message: 'Rol no encontrado' });

    await prisma.rol.delete({ where: { idrol: id } });
    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar rol', error: error.message });
  }
};
