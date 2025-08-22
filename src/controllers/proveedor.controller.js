const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los proveedores
exports.getAll = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany();
    res.json(proveedores);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proveedores', error: error.message });
  }
};

// Obtener proveedor por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const proveedor = await prisma.proveedor.findUnique({
      where: { idproveedor: id } // Usar 'idproveedor' del schema de Prisma
    });
    if (!proveedor) return res.status(404).json({ message: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proveedor', error: error.message });
  }
};

// Crear proveedor
exports.create = async (req, res) => {
  try {
    const {
      tipoDocumento,
      documento,
      nombreEmpresa,
      nombreProveedor,
      contacto,
      correo,
      direccion,
      estado
    } = req.body;

    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        tipodocumento, // Usar 'tipodocumento' del schema de Prisma
        documento: documento ? parseInt(documento) : null,
        nombreempresa, // Usar 'nombreempresa' del schema de Prisma
        nombreproveedor, // Usar 'nombreproveedor' del schema de Prisma
        contacto: contacto ? parseInt(contacto) : null,
        correo,
        direccion,
        estado
      }
    });

    res.status(201).json(nuevoProveedor);
  } catch (error) {
    console.error("Error en create proveedor:", error);
    res.status(500).json({ message: 'Error al crear proveedor', error: error.message });
  }
};

// Actualizar proveedor
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      tipodocumento, // Corregido: Usar 'tipodocumento' de req.body
      documento,     // Corregido: Usar 'documento' de req.body
      nombreempresa, // Corregido: Usar 'nombreempresa' de req.body
      nombreproveedor, // Corregido: Usar 'nombreproveedor' de req.body
      contacto,      // Corregido: Usar 'contacto' de req.body
      correo,
      direccion,
      estado
    } = req.body;

    // Se busca por 'idproveedor', que es el nombre correcto en el schema
    const proveedorExiste = await prisma.proveedor.findUnique({ where: { idproveedor: id } });
    if (!proveedorExiste) return res.status(404).json({ message: 'Proveedor no encontrado' });

    const actualizado = await prisma.proveedor.update({
      where: { idproveedor: id },
      data: {
        tipodocumento,
        documento: documento ? parseInt(documento) : null,
        nombreempresa,
        nombreproveedor,
        contacto: contacto ? parseInt(contacto) : null,
        correo,
        direccion,
        estado
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar proveedor', error: error.message });
  }
};

// Eliminar proveedor
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Se busca por 'idproveedor', que es el nombre correcto en el schema
    const proveedorExiste = await prisma.proveedor.findUnique({ where: { idproveedor: id } });
    if (!proveedorExiste) return res.status(404).json({ message: 'Proveedor no encontrado' });

    // Se elimina usando 'idproveedor'
    await prisma.proveedor.delete({ where: { idproveedor: id } });
    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar proveedor', error: error.message });
  }
};
