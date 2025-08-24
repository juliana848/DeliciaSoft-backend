const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Validar usuario (login simple)
exports.validate = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    const usuario = await prisma.usuarios.findFirst({
      where: { correo },
      include: {
        rol: true // Incluir información del rol
      }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (usuario.hashcontrasena !== contrasena) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Retornamos datos básicos del usuario (sin contraseña)
    res.json({
      idUsuario: usuario.idusuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol ? usuario.rol.rol : null
    });
  } catch (error) {
    console.error('Error en validación:', error);
    res.status(500).json({ message: 'Error en validación', error: error.message });
  }
};

// Obtener todos los usuarios
exports.getAll = async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      include: {
        rol: true // Incluir información del rol
      },
      orderBy: {
        idusuario: 'asc'
      }
    });
    
    console.log('Usuarios obtenidos:', usuarios.length);
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// Obtener usuario por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    
    const usuario = await prisma.usuarios.findUnique({
      where: { idusuario: id },
      include: {
        rol: true // Incluir información del rol
      }
    });
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log('Usuario encontrado:', usuario);
    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
  }
};

// Crear usuario
exports.create = async (req, res) => {
  try {
    const { tipodocumento, documento, nombre, apellido, correo, hashcontrasena, idrol, estado } = req.body;

    console.log('Datos recibidos para crear usuario:', req.body);

    // Validaciones básicas
    if (!tipodocumento || !documento || !nombre || !apellido || !correo || !hashcontrasena || !idrol) {
      return res.status(400).json({ 
        message: 'Todos los campos son obligatorios',
        missing: {
          tipodocumento: !tipodocumento,
          documento: !documento, 
          nombre: !nombre,
          apellido: !apellido,
          correo: !correo,
          hashcontrasena: !hashcontrasena,
          idrol: !idrol
        }
      });
    }

    // Verificar si el correo ya existe
    const usuarioExistente = await prisma.usuarios.findFirst({
      where: { correo }
    });

    if (usuarioExistente) {
      return res.status(400).json({ message: 'Ya existe un usuario con este correo electrónico' });
    }

    // Verificar si el documento ya existe
    const documentoExistente = await prisma.usuarios.findFirst({
      where: { documento: parseInt(documento) }
    });

    if (documentoExistente) {
      return res.status(400).json({ message: 'Ya existe un usuario con este número de documento' });
    }

    // Verificar que el rol existe
    const rolExiste = await prisma.rol.findUnique({
      where: { idrol: parseInt(idrol) }
    });

    if (!rolExiste) {
      return res.status(400).json({ message: 'El rol especificado no existe' });
    }

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        tipodocumento,
        documento: parseInt(documento),
        nombre,
        apellido,
        correo,
        hashcontrasena,
        idrol: parseInt(idrol),
        estado: estado !== undefined ? estado : true
      },
      include: {
        rol: true // Incluir información del rol en la respuesta
      }
    });

    console.log('Usuario creado exitosamente:', nuevoUsuario);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    console.error('Error detallado al crear usuario:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Ya existe un usuario con estos datos únicos',
        field: error.meta?.target
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: 'El rol especificado no existe en la base de datos'
      });
    }
    
    res.status(500).json({ 
      message: 'Error al crear usuario', 
      error: error.message,
      code: error.code 
    });
  }
};

// Actualizar usuario
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tipodocumento, documento, nombre, apellido, correo, hashcontrasena, idrol, estado } = req.body;

    console.log('Datos recibidos para actualizar usuario:', req.body);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const usuarioExiste = await prisma.usuarios.findUnique({ 
      where: { idusuario: id },
      include: { rol: true }
    });
    
    if (!usuarioExiste) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar correo duplicado (excluyendo el usuario actual)
    if (correo && correo !== usuarioExiste.correo) {
      const correoExistente = await prisma.usuarios.findFirst({
        where: { 
          correo,
          idusuario: { not: id }
        }
      });

      if (correoExistente) {
        return res.status(400).json({ message: 'Ya existe un usuario con este correo electrónico' });
      }
    }

    // Verificar documento duplicado (excluyendo el usuario actual)
    if (documento && parseInt(documento) !== usuarioExiste.documento) {
      const documentoExistente = await prisma.usuarios.findFirst({
        where: { 
          documento: parseInt(documento),
          idusuario: { not: id }
        }
      });

      if (documentoExistente) {
        return res.status(400).json({ message: 'Ya existe un usuario con este número de documento' });
      }
    }

    // Verificar que el rol existe si se está actualizando
    if (idrol && parseInt(idrol) !== usuarioExiste.idrol) {
      const rolExiste = await prisma.rol.findUnique({
        where: { idrol: parseInt(idrol) }
      });

      if (!rolExiste) {
        return res.status(400).json({ message: 'El rol especificado no existe' });
      }
    }

    // Preparar datos para actualización (solo incluir hashcontrasena si no es el valor por defecto)
    const updateData = {
      tipodocumento,
      documento: documento ? parseInt(documento) : usuarioExiste.documento,
      nombre,
      apellido,
      correo,
      idrol: idrol ? parseInt(idrol) : usuarioExiste.idrol,
      estado: estado !== undefined ? estado : usuarioExiste.estado
    };

    // Solo incluir hashcontrasena si se proporciona y no es el placeholder
    if (hashcontrasena && hashcontrasena.trim() && hashcontrasena !== '********') {
      updateData.hashcontrasena = hashcontrasena;
    }

    const actualizado = await prisma.usuarios.update({
      where: { idusuario: id },
      data: updateData,
      include: {
        rol: true // Incluir información del rol en la respuesta
      }
    });

    console.log('Usuario actualizado exitosamente:', actualizado);
    res.json(actualizado);
  } catch (error) {
    console.error('Error detallado al actualizar usuario:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Ya existe un usuario con estos datos únicos',
        field: error.meta?.target
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: 'El rol especificado no existe en la base de datos'
      });
    }
    
    res.status(500).json({ 
      message: 'Error al actualizar usuario', 
      error: error.message,
      code: error.code 
    });
  }
};

// Eliminar usuario
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }
    
    const usuarioExiste = await prisma.usuarios.findUnique({ 
      where: { idusuario: id },
      include: { rol: true }
    });
    
    if (!usuarioExiste) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si es administrador
    if (usuarioExiste.rol && usuarioExiste.rol.rol === 'Administrador') {
      return res.status(400).json({ message: 'No se puede eliminar un usuario con rol de Administrador' });
    }

    await prisma.usuarios.delete({ where: { idusuario: id } });
    
    console.log('Usuario eliminado exitosamente:', id);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error detallado al eliminar usuario:', error);
    
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: 'No se puede eliminar el usuario porque tiene registros relacionados'
      });
    }
    
    res.status(500).json({ 
      message: 'Error al eliminar usuario', 
      error: error.message,
      code: error.code 
    });
  }
};