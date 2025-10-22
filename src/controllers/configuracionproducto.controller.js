const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener configuración por ID de producto
exports.getByProductId = async (req, res) => {
  try {
    const idProducto = parseInt(req.params.idProducto);
    
    if (isNaN(idProducto)) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    console.log(`🔍 Buscando configuración para producto ID: ${idProducto}`);

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
      console.log('⚠️ No existe configuración, retornando valores por defecto');
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

    // ✅ TRANSFORMAR los nombres de campos de BD (lowercase) a camelCase para el frontend
    const configuracionTransformada = {
      idconfiguracion: configuracion.idconfiguracion,
      idproductogeneral: configuracion.idproductogeneral,
      tipoPersonalizacion: configuracion.tipopersonalizacion,
      limiteTopping: configuracion.limitetopping,
      limiteSalsa: configuracion.limitesalsa,
      limiteRelleno: configuracion.limiterelleno,
      limiteSabor: configuracion.limitesabor,
      permiteToppings: configuracion.permitetoppings,
      permiteSalsas: configuracion.permitesalsas,
      permiteAdiciones: configuracion.permiteadiciones,
      permiteRellenos: configuracion.permiterellenos,
      permiteSabores: configuracion.permitesabores,
      productogeneral: configuracion.productogeneral
    };

    console.log('✅ Configuración encontrada y transformada:', configuracionTransformada);
    res.json(configuracionTransformada);

  } catch (error) {
    console.error('❌ Error al obtener configuración:', error);
    res.status(500).json({ 
      message: 'Error al obtener configuración', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // ✅ PREPARAR datos con nombres en LOWERCASE para la BD
    const datosConfiguracion = {
      tipopersonalizacion: tipoPersonalizacion || 'basico',
      limitetopping: permiteToppings ? (limiteTopping !== undefined && limiteTopping !== null ? parseInt(limiteTopping) : null) : 0,
      limitesalsa: permiteSalsas ? (limiteSalsa !== undefined && limiteSalsa !== null ? parseInt(limiteSalsa) : null) : 0,
      limiterelleno: permiteRellenos ? (limiteRelleno !== undefined && limiteRelleno !== null ? parseInt(limiteRelleno) : null) : 0,
      limitesabor: permiteSabores ? (limiteSabor !== undefined && limiteSabor !== null ? parseInt(limiteSabor) : null) : 0,
      permitetoppings: Boolean(permiteToppings),
      permitesalsas: Boolean(permiteSalsas),
      permiteadiciones: Boolean(permiteAdiciones),
      permiterellenos: Boolean(permiteRellenos),
      permitesabores: Boolean(permiteSabores)
    };

    console.log('💾 Datos procesados para BD:', JSON.stringify(datosConfiguracion, null, 2));

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

    // ✅ TRANSFORMAR respuesta de BD (lowercase) a camelCase
    const configuracionTransformada = {
      idconfiguracion: configuracion.idconfiguracion,
      idproductogeneral: configuracion.idproductogeneral,
      tipoPersonalizacion: configuracion.tipopersonalizacion,
      limiteTopping: configuracion.limitetopping,
      limiteSalsa: configuracion.limitesalsa,
      limiteRelleno: configuracion.limiterelleno,
      limiteSabor: configuracion.limitesabor,
      permiteToppings: configuracion.permitetoppings,
      permiteSalsas: configuracion.permitesalsas,
      permiteAdiciones: configuracion.permiteadiciones,
      permiteRellenos: configuracion.permiterellenos,
      permiteSabores: configuracion.permitesabores,
      productogeneral: configuracion.productogeneral
    };

    console.log('✅ Configuración guardada:', configuracionTransformada);

    res.json({
      message: 'Configuración guardada exitosamente',
      configuracion: configuracionTransformada
    });

  } catch (error) {
    console.error('❌ Error al guardar configuración:', error);
    res.status(500).json({ 
      message: 'Error al guardar configuración', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // ✅ TRANSFORMAR todas las configuraciones
    const configuracionesTransformadas = configuraciones.map(config => ({
      idconfiguracion: config.idconfiguracion,
      idproductogeneral: config.idproductogeneral,
      tipoPersonalizacion: config.tipopersonalizacion,
      limiteTopping: config.limitetopping,
      limiteSalsa: config.limitesalsa,
      limiteRelleno: config.limiterelleno,
      limiteSabor: config.limitesabor,
      permiteToppings: config.permitetoppings,
      permiteSalsas: config.permitesalsas,
      permiteAdiciones: config.permiteadiciones,
      permiteRellenos: config.permiterellenos,
      permiteSabores: config.permitesabores,
      productogeneral: config.productogeneral
    }));

    res.json(configuracionesTransformadas);
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
      prisma.configuracionproducto.count({ where: { permitetoppings: true } }),
      prisma.configuracionproducto.count({ where: { permitesalsas: true } }),
      prisma.configuracionproducto.count({ where: { permiterellenos: true } }),
      prisma.configuracionproducto.count({ where: { permitesabores: true } })
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