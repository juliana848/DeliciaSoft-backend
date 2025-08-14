// controllers/rol.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ===========================================================
   📌 Roles
=========================================================== */

// GET /api/roles - Obtener todos los roles con permisos
exports.getAll = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      include: {
        rolpermiso: {
          include: { permisos: true },
          where: { estado: true }
        }
      }
    });

    const rolesTransformados = roles.map(rol => ({
      idrol: rol.idrol,
      rol: rol.rol,
      descripcion: rol.descripcion,
      estado: rol.estado,
      permisos: rol.rolpermiso.map(rp => rp.idpermiso)
    }));

    res.json(rolesTransformados);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener roles', error: error.message });
  }
};

// GET /api/roles/:id - Obtener rol específico con permisos
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rol = await prisma.rol.findUnique({
      where: { idrol: id },
      include: {
        rolpermiso: {
          include: { permisos: true },
          where: { estado: true }
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

// POST /api/roles - Crear rol con permisos
exports.create = async (req, res) => {
  try {
    const { rol, descripcion, estado = true, permisos = [] } = req.body;

    if (!rol?.trim()) return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
    if (!descripcion?.trim()) return res.status(400).json({ message: 'La descripción es obligatoria' });

    if (rol.length > 20) return res.status(400).json({ message: 'El nombre no puede tener más de 20 caracteres' });
    if (descripcion.length > 30) return res.status(400).json({ message: 'La descripción no puede tener más de 30 caracteres' });

    const rolExistente = await prisma.rol.findFirst({ where: { rol: rol.trim() } });
    if (rolExistente) return res.status(400).json({ message: 'Ya existe un rol con este nombre' });

    const nuevoRol = await prisma.rol.create({
      data: { rol: rol.trim(), descripcion: descripcion.trim(), estado }
    });

    if (permisos.length > 0) {
      await prisma.rolpermiso.createMany({
        data: permisos.map(idPermiso => ({
          idrol: nuevoRol.idrol,
          idpermiso: idPermiso,
          estado: true
        }))
      });
    }

    res.status(201).json(nuevoRol);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear rol', error: error.message });
  }
};

// PUT /api/roles/:id - Actualizar rol y permisos
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rol, descripcion, estado, permisos } = req.body;

    const rolExiste = await prisma.rol.findUnique({ where: { idrol: id } });
    if (!rolExiste) return res.status(404).json({ message: 'Rol no encontrado' });

    if (rol && rol.length > 20) return res.status(400).json({ message: 'El nombre no puede tener más de 20 caracteres' });
    if (descripcion && descripcion.length > 30) return res.status(400).json({ message: 'La descripción no puede tener más de 30 caracteres' });

    if (rol && rol.trim() !== rolExiste.rol) {
      const otro = await prisma.rol.findFirst({ where: { rol: rol.trim(), idrol: { not: id } } });
      if (otro) return res.status(400).json({ message: 'Ya existe un rol con este nombre' });
    }

    await prisma.rol.update({
      where: { idrol: id },
      data: {
        rol: rol?.trim() ?? undefined,
        descripcion: descripcion?.trim() ?? undefined,
        estado: estado ?? undefined
      }
    });

    if (Array.isArray(permisos)) {
      await prisma.rolpermiso.updateMany({
        where: { idrol: id },
        data: { estado: false }
      });

      for (const idPermiso of permisos) {
        await prisma.rolpermiso.upsert({
          where: { idrol_idpermiso: { idrol: id, idpermiso: idPermiso } },
          update: { estado: true },
          create: { idrol: id, idpermiso: idPermiso, estado: true }
        });
      }
    }

    res.json({ message: 'Rol actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
};

// PATCH /api/roles/:id/estado - Cambiar solo estado
exports.changeState = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estado } = req.body;

    const rol = await prisma.rol.update({
      where: { idrol: id },
      data: { estado }
    });

    res.json(rol);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};

// DELETE /api/roles/:id - Eliminar rol (solo si no tiene usuarios)
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const usuariosAsociados = await prisma.usuarios.count({ where: { idrol: id } });
    if (usuariosAsociados > 0) {
      return res.status(400).json({ message: 'No se puede eliminar el rol porque tiene usuarios asociados' });
    }

    await prisma.rolpermiso.deleteMany({ where: { idrol: id } });
    await prisma.rol.delete({ where: { idrol: id } });

    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar rol', error: error.message });
  }
};

/* ===========================================================
   📌 Permisos
=========================================================== */

// GET /api/permisos
exports.getPermisos = async (req, res) => {
  try {
    const permisos = await prisma.permisos.findMany({ where: { estado: true } });
    res.json(permisos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// GET /api/roles/:id/permisos
exports.getPermisosByRol = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const permisos = await prisma.rolpermiso.findMany({
      where: { idrol: id, estado: true },
      include: { permisos: true }
    });

    res.json(permisos.map(p => ({
      idpermiso: p.permisos.idpermiso,
      modulo: p.permisos.modulo,
      descripcion: p.permisos.descripcion
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// POST /api/roles/:id/permisos
exports.addPermisosToRol = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { permisos } = req.body;

    if (!Array.isArray(permisos)) return res.status(400).json({ message: 'Los permisos deben ser un array' });

    await prisma.rolpermiso.createMany({
      data: permisos.map(idPermiso => ({ idrol: id, idpermiso: idPermiso, estado: true })),
      skipDuplicates: true
    });

    res.json({ message: 'Permisos asignados exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al asignar permisos', error: error.message });
  }
};

// PUT /api/roles/:id/permisos
exports.updatePermisosRol = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { permisos } = req.body;

    await prisma.rolpermiso.updateMany({ where: { idrol: id }, data: { estado: false } });

    for (const idPermiso of permisos) {
      await prisma.rolpermiso.upsert({
        where: { idrol_idpermiso: { idrol: id, idpermiso: idPermiso } },
        update: { estado: true },
        create: { idrol: id, idpermiso: idPermiso, estado: true }
      });
    }

    res.json({ message: 'Permisos actualizados correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar permisos', error: error.message });
  }
};
