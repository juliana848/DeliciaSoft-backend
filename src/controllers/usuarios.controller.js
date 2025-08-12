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
      where: { correo }
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
      correo: usuario.correo
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en validación', error: error.message });
  }
};

// Obtener todos los usuarios
exports.getAll = async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

// Obtener usuario por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const usuario = await prisma.usuarios.findUnique({
      where: { idusuario: id }
    });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
  }
};

// Crear usuario
exports.create = async (req, res) => {
  try {
    const { tipodocumento, documento, nombre, apellido, correo, hashcontrasena, idrol, estado } = req.body;

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        tipodocumento,
        documento,
        nombre,
        apellido,
        correo,
        hashcontrasena,
        idrol,
        estado
      }
    });

    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

// Actualizar usuario
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tipodocumento, documento, nombre, apellido, correo, hashcontrasena, idrol, estado } = req.body;

    const usuarioExiste = await prisma.usuarios.findUnique({ where: { idusuario: id } });
    if (!usuarioExiste) return res.status(404).json({ message: 'Usuario no encontrado' });

    const actualizado = await prisma.usuarios.update({
      where: { idusuario: id },
      data: {
        tipodocumento,
        documento,
        nombre,
        apellido,
        correo,
        hashcontrasena,
        idrol,
        estado
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

// Eliminar usuario
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const usuarioExiste = await prisma.usuarios.findUnique({ where: { idusuario: id } });
    if (!usuarioExiste) return res.status(404).json({ message: 'Usuario no encontrado' });

    await prisma.usuarios.delete({ where: { idusuario: id } });
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};
