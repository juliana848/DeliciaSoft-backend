const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los insumos
exports.getAll = async (req, res) => {
  try {
    const insumos = await prisma.insumos.findMany({
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });
    res.json(insumos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener insumos', error: error.message });
  }
};

// Obtener insumo por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const insumo = await prisma.insumos.findUnique({
      where: { idinsumo: id },
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });
    if (!insumo) return res.status(404).json({ message: 'Insumo no encontrado' });
    res.json(insumo);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener insumo', error: error.message });
  }
};

// Crear nuevo insumo
exports.create = async (req, res) => {
  try {
    const {
      nombreinsumo,
      idcategoriainsumos,
      idunidadmedida,
      fecharegistro,
      idimagen,
      estado,
      cantidad
    } = req.body;

    const nuevoInsumo = await prisma.insumos.create({
      data: {
        nombreinsumo,
        idcategoriainsumos,
        idunidadmedida,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        idimagen,
        estado,
        cantidad: cantidad ? parseFloat(cantidad) : null
      }
    });

    res.status(201).json(nuevoInsumo);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear insumo', error: error.message });
  }
};

// Actualizar insumo
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      nombreinsumo,
      idcategoriainsumos,
      idunidadmedida,
      fecharegistro,
      idimagen,
      estado,
      cantidad
    } = req.body;

    const insumoExiste = await prisma.insumos.findUnique({ where: { idinsumo: id } });
    if (!insumoExiste) return res.status(404).json({ message: 'Insumo no encontrado' });

    const actualizado = await prisma.insumos.update({
      where: { idinsumo: id },
      data: {
        nombreinsumo,
        idcategoriainsumos,
        idunidadmedida,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        idimagen,
        estado,
        cantidad: cantidad ? parseFloat(cantidad) : null
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar insumo', error: error.message });
  }
};

// Eliminar insumo
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const insumoExiste = await prisma.insumos.findUnique({ where: { idinsumo: id } });
    if (!insumoExiste) return res.status(404).json({ message: 'Insumo no encontrado' });

    await prisma.insumos.delete({ where: { idinsumo: id } });

    res.json({ message: 'Insumo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar insumo', error: error.message });
  }
};
