const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener configuración por ID de producto
exports.getByProductId = async (req, res) => {
  try {
    const idProducto = parseInt(req.params.idProducto);
    
    if (isNaN(idProducto)) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    const configuracion = await prisma.configuracionproducto.findUnique({
      where: { idproductogeneral: idProducto },
      include: {
        productogeneral: {
          select: {
            nombreproducto: true,
            precioproducto: true
          }
        }
      }
    });

    if (!configuracion) {
      // Retornar configuración por defecto si no existe
      return res.json({
        idproductogeneral: idProducto,
        tipoPersonalizacion: 'basico',
        limiteTopping: 0,
        limiteSalsa: 0,
        limiteRelleno: 0,
        limiteSabor: 0,
        permiteToppings: false,
        permiteSalsas: false,
        permiteAdiciones: true,
        permiteRellenos: false,
        permiteSabores: false,
        esNuevo: true
      });
    }

    res.json(configuracion);
  } catch (error) {
    console.error('❌ Error al obtener configuración:', error);
    res.status(500).json({ 
      message: 'Error al obtener configuración', 
      error: error.message 
    });
  }
};

// Crear o actualizar configuración
exports.createOrUpdate = async (req, res) => {
  try {
    const {
      idproductogeneral,
      tipoPersonalizacion,
      limiteTopping,
      limiteSalsa,
      limiteRelleno,
      limiteSabor,
      permiteToppings,
      permiteSalsas,
      permiteAdiciones,
      permiteRellenos,
      permiteSabores
    } = req.body;

    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));

    // Validaciones
    if (!idproductogeneral) {
      return res.status(400).json({ message: 'ID de producto es requerido' });
    }

    // Verificar que el producto existe
    const productoExiste = await prisma.productogeneral.findUnique({
      where: { idproductogeneral: parseInt(idproductogeneral) }
    });

    if (!productoExiste) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Preparar datos
    const datosConfiguracion = {
      tipoPersonalizacion: tipoPersonalizacion || 'basico',
      limiteTopping: permiteToppings ? (limiteTopping !== undefined ? parseInt(limiteTopping) : null) : 0,
      limiteSalsa: permiteSalsas ? (limiteSalsa !== undefined ? parseInt(limiteSalsa) : null) : 0,
      limiteRelleno: permiteRellenos ? (limiteRelleno !== undefined ? parseInt(limiteRelleno) : null) : 0,
      limiteSabor: permiteSabores ? (limiteSabor !== undefined ? parseInt(limiteSabor) : null) : 0,
      permiteToppings: Boolean(permiteToppings),
      permiteSalsas: Boolean(permiteSalsas),
      permiteAdiciones: Boolean(permiteAdiciones),
      permiteRellenos: Boolean(permiteRellenos),
      permiteSabores: Boolean(permiteSabores)
    };

    console.log('💾 Datos procesados:', JSON.stringify(datosConfiguracion, null, 2));

    // Crear o actualizar usando upsert
    const configuracion = await prisma.configuracionproducto.upsert({
      where: { idproductogeneral: parseInt(idproductogeneral) },
      update: datosConfiguracion,
      create: {
        idproductogeneral: parseInt(idproductogeneral),
        ...datosConfiguracion
      },
      include: {
        productogeneral: {
          select: {
            nombreproducto: true,
            precioproducto: true
          }
        }
      }
    });

    console.log('✅ Configuración guardada:', configuracion);

    res.json({
      message: 'Configuración guardada exitosamente',
      configuracion
    });

  } catch (error) {
    console.error('❌ Error al guardar configuración:', error);
    res.status(500).json({ 
      message: 'Error al guardar configuración', 
      error: error.message 
    });
  }
};

// Eliminar configuración
exports.delete = async (req, res) => {
  try {
    const idProducto = parseInt(req.params.idProducto);
    
    if (isNaN(idProducto)) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    const configuracion = await prisma.configuracionproducto.findUnique({
      where: { idproductogeneral: idProducto }
    });

    if (!configuracion) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }

    await prisma.configuracionproducto.delete({
      where: { idproductogeneral: idProducto }
    });

    res.json({ message: 'Configuración eliminada correctamente' });

  } catch (error) {
    console.error('❌ Error al eliminar configuración:', error);
    res.status(500).json({ 
      message: 'Error al eliminar configuración', 
      error: error.message 
    });
  }
};

// Obtener todas las configuraciones
exports.getAll = async (req, res) => {
  try {
    const configuraciones = await prisma.configuracionproducto.findMany({
      include: {
        productogeneral: {
          select: {
            nombreproducto: true,
            precioproducto: true,
            estado: true
          }
        }
      },
      orderBy: {
        idconfiguracion: 'desc'
      }
    });

    res.json(configuraciones);
  } catch (error) {
    console.error('❌ Error al obtener configuraciones:', error);
    res.status(500).json({ 
      message: 'Error al obtener configuraciones', 
      error: error.message 
    });
  }
};

// Obtener estadísticas de configuraciones
exports.getEstadisticas = async (req, res) => {
  try {
    const [total, conToppings, conSalsas, conRellenos, conSabores] = await Promise.all([
      prisma.configuracionproducto.count(),
      prisma.configuracionproducto.count({ where: { permiteToppings: true } }),
      prisma.configuracionproducto.count({ where: { permiteSalsas: true } }),
      prisma.configuracionproducto.count({ where: { permiteRellenos: true } }),
      prisma.configuracionproducto.count({ where: { permiteSabores: true } })
    ]);

    res.json({
      total,
      conToppings,
      conSalsas,
      conRellenos,
      conSabores,
      porcentajePersonalizados: total > 0 ? ((conToppings + conSalsas + conRellenos + conSabores) / total * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas', 
      error: error.message 
    });
  }
};