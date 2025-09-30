const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔹 Función auxiliar para formatear insumo
function formatearInsumo(insumo) {
  if (!insumo) return null;
  return {
    ...insumo,
    cantidad: insumo.cantidad !== null ? Number(insumo.cantidad) : 0,
    nombreCategoria: insumo.categoriainsumos?.nombrecategoria || "Categoría desconocida",
    nombreUnidadMedida: insumo.unidadmedida?.nombreunidad || "Unidad desconocida"
  };
}

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

    res.json(insumos.map(formatearInsumo));
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

    res.json(formatearInsumo(insumo));
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
      cantidad,
      precio,
      stockminimo
    } = req.body;

    const nuevoInsumo = await prisma.insumos.create({
      data: {
        nombreinsumo,
        idcategoriainsumos,
        idunidadmedida,
        fecharegistro: fecharegistro ? new Date(fecharegistro) : null,
        idimagen,
        estado,
        cantidad: cantidad ? parseFloat(cantidad) : 0,
        precio: precio !== undefined && precio !== null ? parseFloat(precio) : 0,
        stockminimo: stockminimo !== undefined && stockminimo !== null ? parseInt(stockminimo) : 5
      },
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });

    res.status(201).json(formatearInsumo(nuevoInsumo));
  } catch (error) {
    res.status(500).json({ message: 'Error al crear insumo', error: error.message });
  }
};

// Sumar cantidad
exports.sumarCantidad = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { cantidad } = req.body;

    if (cantidad === undefined || isNaN(cantidad)) {
      return res.status(400).json({ message: "Debe enviar una cantidad válida" });
    }

    const insumoActualizado = await prisma.insumos.update({
      where: { idinsumo: id },
      data: {
        cantidad: { increment: parseFloat(cantidad) }
      },
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });

    res.json(formatearInsumo(insumoActualizado));
  } catch (error) {
    res.status(500).json({ message: "Error al sumar cantidad", error: error.message });
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
      cantidad,
      precio,
      stockminimo
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
        cantidad: cantidad !== undefined ? parseFloat(cantidad) : insumoExiste.cantidad,
        precio: precio !== undefined && precio !== null ? parseFloat(precio) : insumoExiste.precio,
        stockminimo: stockminimo !== undefined && stockminimo !== null ? parseInt(stockminimo) : insumoExiste.stockminimo
      },
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });

    res.json(formatearInsumo(actualizado));
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar insumo', error: error.message });
  }
};

//otra vez 
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