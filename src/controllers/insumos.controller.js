const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función auxiliar para formatear insumo
function formatearInsumo(insumo) {
  if (!insumo) return null;
  return {
    ...insumo,
    cantidad: insumo.cantidad !== null ? Number(insumo.cantidad) : 0,
    precio: insumo.precio !== null ? Number(insumo.precio) : 0,
    stockminimo: insumo.stockminimo !== null ? Number(insumo.stockminimo) : 5,
    nombreCategoria: insumo.categoriainsumos?.nombrecategoria || "Categoría desconocida",
    nombreUnidadMedida: insumo.unidadmedida?.unidadmedida || "Unidad desconocida"
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

    // Construir el objeto data correctamente
    const dataToCreate = {
      nombreinsumo,
      estado: estado !== undefined ? estado : true,
      cantidad: cantidad !== undefined && cantidad !== null ? parseFloat(cantidad) : 0,
      precio: precio !== undefined && precio !== null ? parseFloat(precio) : 0,
      stockminimo: stockminimo !== undefined && stockminimo !== null ? parseInt(stockminimo) : 5,
      fecharegistro: fecharegistro ? new Date(fecharegistro) : null
    };

    // Agregar relaciones con connect
    if (idcategoriainsumos) {
      dataToCreate.categoriainsumos = {
        connect: { idcategoriainsumos: parseInt(idcategoriainsumos) }
      };
    }

    if (idunidadmedida) {
      dataToCreate.unidadmedida = {
        connect: { idunidadmedida: parseInt(idunidadmedida) }
      };
    }

    if (idimagen) {
      dataToCreate.imagenes = {
        connect: { idimagen: parseInt(idimagen) }
      };
    }

    const nuevoInsumo = await prisma.insumos.create({
      data: dataToCreate,
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });

    res.status(201).json(formatearInsumo(nuevoInsumo));
  } catch (error) {
    console.error('Error al crear insumo:', error);
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

    // Construir el objeto data correctamente
    const dataToUpdate = {
      nombreinsumo,
      estado,
      cantidad: cantidad !== undefined && cantidad !== null ? parseFloat(cantidad) : insumoExiste.cantidad,
      precio: precio !== undefined && precio !== null ? parseFloat(precio) : insumoExiste.precio,
      stockminimo: stockminimo !== undefined && stockminimo !== null ? parseInt(stockminimo) : insumoExiste.stockminimo,
      fecharegistro: fecharegistro ? new Date(fecharegistro) : insumoExiste.fecharegistro
    };

    // Agregar relaciones con connect solo si hay cambios
    if (idcategoriainsumos !== undefined && idcategoriainsumos !== null) {
      dataToUpdate.categoriainsumos = {
        connect: { idcategoriainsumos: parseInt(idcategoriainsumos) }
      };
    }

    if (idunidadmedida !== undefined && idunidadmedida !== null) {
      dataToUpdate.unidadmedida = {
        connect: { idunidadmedida: parseInt(idunidadmedida) }
      };
    }

    if (idimagen !== undefined && idimagen !== null) {
      dataToUpdate.imagenes = {
        connect: { idimagen: parseInt(idimagen) }
      };
    }

    const actualizado = await prisma.insumos.update({
      where: { idinsumo: id },
      data: dataToUpdate,
      include: {
        categoriainsumos: true,
        imagenes: true,
        unidadmedida: true
      }
    });

    res.json(formatearInsumo(actualizado));
  } catch (error) {
    console.error('Error al actualizar insumo:', error);
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
//  ensayo para git 
//esayo dos no me quiere dejar hacer pulll 