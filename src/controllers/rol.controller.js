// controllers/rol.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ===========================================================
   📌 Roles
=========================================================== */

// Obtener todos los roles con permisos activos
exports.getAll = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      include: {
        rolpermiso: {
          where: { estado: true },
          select: { idpermiso: true }
        }
      }
    });

    res.json(
      roles.map(rol => ({
        idrol: rol.idrol,
        rol: rol.rol,
        descripcion: rol.descripcion,
        estado: rol.estado,
        permisos: rol.rolpermiso.map(rp => rp.idpermiso)
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener roles', error: error.message });
  }
};

// Obtener un rol específico
exports.getById = async (req, res) => {
  try {
    const idrol = parseInt(req.params.id);
    const rol = await prisma.rol.findUnique({
      where: { idrol },
      include: {
        rolpermiso: {
          where: { estado: true },
          select: { idpermiso: true }
        }
      }
    });

    if (!rol) return res.status(404).json({ message: 'Rol no encontrado' });

    res.json({
      idrol: rol.idrol,
      rol: rol.rol,
      descripcion: rol.descripcion,
      estado: rol.estado,
      permisos: rol.rolpermiso.map(rp => rp.idpermiso)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener rol', error: error.message });
  }
};

// Crear rol con permisos
exports.create = async (req, res) => {
  const { rol, descripcion, estado, permisos } = req.body;

  if (!rol || !Array.isArray(permisos) || permisos.length === 0) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }

  try {
    const nuevoRol = await prisma.$transaction(async tx => {
      const rolCreado = await tx.rol.create({
        data: { rol: rol.trim(), descripcion: descripcion?.trim(), estado }
      });

      await tx.rolpermiso.createMany({
        data: permisos.map(idpermiso => ({
          idrol: rolCreado.idrol,
          idpermiso,
          estado: true
        }))
      });

      return rolCreado;
    });

    res.status(201).json({ message: 'Rol creado correctamente', idrol: nuevoRol.idrol });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear rol', error: error.message });
  }
};

// Actualizar rol y sus permisos
exports.update = async (req, res) => {
  const idrol = parseInt(req.params.id);
  const { rol, descripcion, estado, permisos } = req.body;

  try {
    const rolExiste = await prisma.rol.findUnique({ where: { idrol } });
    if (!rolExiste) return res.status(404).json({ message: 'Rol no encontrado' });

    await prisma.rol.update({
      where: { idrol },
      data: {
        rol: rol?.trim() ?? undefined,
        descripcion: descripcion?.trim() ?? undefined,
        estado
      }
    });

    if (Array.isArray(permisos)) {
      await prisma.rolpermiso.updateMany({ where: { idrol }, data: { estado: false } });

      for (const idpermiso of permisos) {
        await prisma.rolpermiso.upsert({
          where: { idrol_idpermiso: { idrol, idpermiso } },
          update: { estado: true },
          create: { idrol, idpermiso, estado: true }
        });
      }
    }

    res.json({ message: 'Rol actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
};

// Cambiar solo estado del rol
exports.changeState = async (req, res) => {
  const idrol = parseInt(req.params.id);
  const { estado } = req.body;

  try {
    const rol = await prisma.rol.update({
      where: { idrol },
      data: { estado }
    });

    res.json(rol);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};

// Eliminar rol si no tiene usuarios
exports.remove = async (req, res) => {
  const idrol = parseInt(req.params.id);

  try {
    const usuarios = await prisma.usuarios.count({ where: { idrol } });
    if (usuarios > 0) {
      return res.status(400).json({ message: 'No se puede eliminar el rol porque tiene usuarios asociados' });
    }

    await prisma.rolpermiso.deleteMany({ where: { idrol } });
    await prisma.rol.delete({ where: { idrol } });

    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar rol', error: error.message });
  }
};

/* ===========================================================
   📌 Permisos
=========================================================== */

// Obtener todos los permisos activos
exports.getPermisos = async (req, res) => {
  try {
    const permisos = await prisma.permisos.findMany({ where: { estado: true } });
    res.json(permisos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// Obtener permisos de un rol
exports.getPermisosByRol = async (req, res) => {
  const idrol = parseInt(req.params.id);
  try {
    const permisos = await prisma.rolpermiso.findMany({
      where: { idrol, estado: true },
      include: { permisos: true }
    });

    res.json(
      permisos.map(p => ({
        idpermiso: p.permisos.idpermiso,
        modulo: p.permisos.modulo,
        descripcion: p.permisos.descripcion
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// Agregar permisos a un rol
exports.addPermisosToRol = async (req, res) => {
  const idrol = parseInt(req.params.id);
  const { permisos } = req.body;

  if (!Array.isArray(permisos)) {
    return res.status(400).json({ message: 'Los permisos deben ser un array' });
  }

  try {
    await prisma.rolpermiso.createMany({
      data: permisos.map(idpermiso => ({ idrol, idpermiso, estado: true })),
      skipDuplicates: true
    });

    res.json({ message: 'Permisos asignados exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al asignar permisos', error: error.message });
  }
};

// Actualizar permisos de un rol
exports.updatePermisosRol = async (req, res) => {
  const idrol = parseInt(req.params.id);
  const { permisos } = req.body;

  try {
    await prisma.rolpermiso.updateMany({ where: { idrol }, data: { estado: false } });

    for (const idpermiso of permisos) {
      await prisma.rolpermiso.upsert({
        where: { idrol_idpermiso: { idrol, idpermiso } },
        update: { estado: true },
        create: { idrol, idpermiso, estado: true }
      });
    }

    res.json({ message: 'Permisos actualizados correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar permisos', error: error.message });
  }
};
