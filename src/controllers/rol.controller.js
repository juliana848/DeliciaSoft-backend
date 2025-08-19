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
    console.error('Error al obtener roles:', error);
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
    console.error('Error al obtener rol:', error);
    res.status(500).json({ message: 'Error al obtener rol', error: error.message });
  }
};

// Crear rol con permisos - CORREGIDO
exports.create = async (req, res) => {
  const { rol, descripcion, estado = true, permisos = [] } = req.body;

  // Validaciones
  if (!rol || !rol.trim()) {
    return res.status(400).json({ message: "El nombre del rol es obligatorio" });
  }

  if (!descripcion || !descripcion.trim()) {
    return res.status(400).json({ message: "La descripción del rol es obligatoria" });
  }

  if (!Array.isArray(permisos) || permisos.length === 0) {
    return res.status(400).json({ message: "Debe seleccionar al menos un permiso" });
  }

  try {
    // Verificar que no exista un rol con el mismo nombre
    const rolExistente = await prisma.rol.findFirst({
      where: { 
        rol: {
          equals: rol.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (rolExistente) {
      return res.status(400).json({ message: "Ya existe un rol con este nombre" });
    }

    // Verificar que todos los permisos existan
    const permisosValidos = await prisma.permisos.findMany({
      where: { 
        idpermiso: { in: permisos },
        estado: true 
      },
      select: { idpermiso: true }
    });

    if (permisosValidos.length !== permisos.length) {
      return res.status(400).json({ message: "Algunos permisos no son válidos" });
    }

    // Crear rol con permisos en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el rol
      const rolCreado = await tx.rol.create({
        data: { 
          rol: rol.trim(), 
          descripcion: descripcion.trim(), 
          estado 
        }
      });

      // Asignar permisos al rol
      if (permisos.length > 0) {
        await tx.rolpermiso.createMany({
          data: permisos.map(idpermiso => ({
            idrol: rolCreado.idrol,
            idpermiso,
            estado: true
          }))
        });
      }

      return rolCreado;
    });

    res.status(201).json({ 
      message: 'Rol creado correctamente', 
      idrol: resultado.idrol,
      rol: resultado
    });

  } catch (error) {
    console.error('Error al crear rol:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un rol con este nombre' });
    }
    
    res.status(500).json({ message: 'Error al crear rol', error: error.message });
  }
};

// Actualizar rol y sus permisos - CORREGIDO
exports.update = async (req, res) => {
  const idrol = parseInt(req.params.id);
  const { rol, descripcion, estado, permisos } = req.body;

  if (isNaN(idrol)) {
    return res.status(400).json({ message: 'ID de rol inválido' });
  }

  try {
    // Verificar que el rol existe
    const rolExiste = await prisma.rol.findUnique({ where: { idrol } });
    if (!rolExiste) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    // Si se está actualizando el nombre, verificar que no exista otro rol con ese nombre
    if (rol && rol.trim() && rol.trim().toLowerCase() !== rolExiste.rol.toLowerCase()) {
      const nombreExiste = await prisma.rol.findFirst({
        where: {
          rol: {
            equals: rol.trim(),
            mode: 'insensitive'
          },
          idrol: { not: idrol }
        }
      });

      if (nombreExiste) {
        return res.status(400).json({ message: 'Ya existe otro rol con este nombre' });
      }
    }

    // Validar permisos si vienen en la petición
    if (Array.isArray(permisos) && permisos.length > 0) {
      const permisosValidos = await prisma.permisos.findMany({
        where: { 
          idpermiso: { in: permisos },
          estado: true 
        },
        select: { idpermiso: true }
      });

      if (permisosValidos.length !== permisos.length) {
        return res.status(400).json({ message: "Algunos permisos no son válidos" });
      }
    }

    // Actualizar en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar datos básicos del rol
      const rolActualizado = await tx.rol.update({
        where: { idrol },
        data: {
          rol: rol?.trim() || undefined,
          descripcion: descripcion?.trim() || undefined,
          estado: estado !== undefined ? estado : undefined
        }
      });

      // Actualizar permisos si vienen en la petición
      if (Array.isArray(permisos)) {
        // Desactivar todos los permisos actuales
        await tx.rolpermiso.updateMany({ 
          where: { idrol }, 
          data: { estado: false } 
        });

        // Asignar nuevos permisos
        if (permisos.length > 0) {
          for (const idpermiso of permisos) {
            await tx.rolpermiso.upsert({
              where: { 
                idrol_idpermiso: { idrol, idpermiso } 
              },
              update: { estado: true },
              create: { idrol, idpermiso, estado: true }
            });
          }
        }
      }

      return rolActualizado;
    });

    res.json({ 
      message: 'Rol actualizado correctamente',
      rol: resultado
    });

  } catch (error) {
    console.error('Error al actualizar rol:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe otro rol con este nombre' });
    }
    
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
};

// Cambiar solo estado del rol
exports.changeState = async (req, res) => {
  const idrol = parseInt(req.params.id);
  const { estado } = req.body;

  if (isNaN(idrol)) {
    return res.status(400).json({ message: 'ID de rol inválido' });
  }

  if (typeof estado !== 'boolean') {
    return res.status(400).json({ message: 'El estado debe ser un valor booleano' });
  }

  try {
    const rol = await prisma.rol.update({
      where: { idrol },
      data: { estado }
    });

    res.json({
      message: `Rol ${estado ? 'activado' : 'desactivado'} correctamente`,
      rol
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    
    res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
  }
};

// Eliminar rol si no tiene usuarios
exports.remove = async (req, res) => {
  const idrol = parseInt(req.params.id);

  if (isNaN(idrol)) {
    return res.status(400).json({ message: 'ID de rol inválido' });
  }

  try {
    // Verificar si tiene usuarios asociados
    const usuarios = await prisma.usuarios.count({ where: { idrol } });
    if (usuarios > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el rol porque tiene usuarios asociados' 
      });
    }

    // Eliminar en transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar permisos asociados
      await tx.rolpermiso.deleteMany({ where: { idrol } });
      
      // Eliminar el rol
      await tx.rol.delete({ where: { idrol } });
    });

    res.json({ message: 'Rol eliminado correctamente' });

  } catch (error) {
    console.error('Error al eliminar rol:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    
    res.status(500).json({ message: 'Error al eliminar rol', error: error.message });
  }
};

/* ===========================================================
   📌 Permisos
=========================================================== */

// Obtener todos los permisos activos
exports.getPermisos = async (req, res) => {
  try {
    const permisos = await prisma.permisos.findMany({ 
      where: { estado: true },
      orderBy: [
        { modulo: 'asc' },
        { descripcion: 'asc' }
      ]
    });
    res.json(permisos);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// Obtener permisos de un rol - CORREGIDO
exports.getPermisosByRol = async (req, res) => {
  const idrol = parseInt(req.params.id);
  
  if (isNaN(idrol)) {
    return res.status(400).json({ message: 'ID de rol inválido' });
  }

  try {
    const permisos = await prisma.rolpermiso.findMany({
      where: { idrol, estado: true },
      include: { 
        permisos: {
          where: { estado: true }
        }
      }
    });

    // Filtrar solo los permisos que están activos
    const permisosActivos = permisos.filter(p => p.permisos);

    res.json(
      permisosActivos.map(p => ({
        idpermiso: p.permisos.idpermiso,
        modulo: p.permisos.modulo,
        descripcion: p.permisos.descripcion
      }))
    );
  } catch (error) {
    console.error('Error al obtener permisos del rol:', error);
    res.status(500).json({ message: 'Error al obtener permisos', error: error.message });
  }
};

// Verificar si un rol tiene usuarios asociados
exports.getRolUsuarios = async (req, res) => {
  const idrol = parseInt(req.params.id);
  
  if (isNaN(idrol)) {
    return res.status(400).json({ message: 'ID de rol inválido' });
  }

  try {
    const usuarios = await prisma.usuarios.findMany({
      where: { idrol },
      select: { 
        idusuario: true,
        nombre: true,
        apellido: true,
        correo: true
      }
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios del rol:', error);
    res.status(500).json({ message: 'Error al obtener usuarios del rol', error: error.message });
  }
};