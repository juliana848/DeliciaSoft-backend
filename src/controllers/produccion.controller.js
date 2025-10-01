const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las producciones
exports.getAll = async (req, res) => {
  try {
    const producciones = await prisma.produccion.findMany({
      include: {
        detalleproduccion: {
          include: {
            productogeneral: {
              include: {
                imagenes: {
                  select: { urlimg: true }
                },
                receta: {
                  include: {
                    detallereceta: {
                      include: {
                        insumos: {
                          select: {
                            nombreinsumo: true,
                            idinsumo: true
                          }
                        },
                        unidadmedida: {
                          select: {
                            unidadmedida: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        idproduccion: 'desc'
      }
    });

    // Transformar datos para el frontend
    const produccionesTransformadas = producciones.map(prod => ({
      ...prod,
      detalleproduccion: prod.detalleproduccion?.map(detalle => ({
        id: detalle.productogeneral?.idproductogeneral,
        nombre: detalle.productogeneral?.nombreproducto,
        cantidad: parseFloat(detalle.cantidadproducto || 0),
        imagen: detalle.productogeneral?.imagenes?.urlimg || null,
        receta: detalle.productogeneral?.receta ? {
          id: detalle.productogeneral.receta.idreceta,
          nombre: detalle.productogeneral.receta.nombrereceta,
          especificaciones: detalle.productogeneral.receta.especificaciones,
          imagen: detalle.productogeneral.imagenes?.urlimg || null,
          insumos: detalle.productogeneral.receta.detallereceta?.map(dr => ({
            id: dr.idinsumo,
            nombre: dr.insumos?.nombreinsumo || 'Sin nombre',
            cantidad: parseFloat(dr.cantidad || 0),
            unidad: dr.unidadmedida?.unidadmedida || 'unidad'
          })) || [],
          pasos: [] // Si tienes pasos, agrégalos aquí
        } : null,
        insumos: detalle.productogeneral?.receta?.detallereceta?.map(dr => ({
          id: dr.idinsumo,
          nombre: dr.insumos?.nombreinsumo || 'Sin nombre',
          cantidad: parseFloat(dr.cantidad || 0),
          unidad: dr.unidadmedida?.unidadmedida || 'unidad'
        })) || []
      })) || []
    }));

    res.json(produccionesTransformadas);
  } catch (error) {
    console.error('❌ Error al obtener producciones:', error);
    res.status(500).json({ 
      message: 'Error al obtener producciones', 
      error: error.message 
    });
  }
};


// Obtener producción por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const produccion = await prisma.produccion.findUnique({
      where: { idproduccion: id }
    });
    if (!produccion) return res.status(404).json({ message: 'Producción no encontrada' });
    res.json(produccion);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producción', error: error.message });
  }
};

// Generar número de pedido automático
async function generarNumeroPedido() {
  try {
    // Obtener el último pedido
    const ultimosPedidos = await prisma.produccion.findMany({
      where: {
        numeropedido: {
          not: null,
          not: ''
        }
      },
      orderBy: {
        idproduccion: 'desc'
      },
      take: 1
    });

    let nuevoNumero = 1;
    
    if (ultimosPedidos.length > 0 && ultimosPedidos[0].numeropedido) {
      // Extraer el número del formato P-001
      const match = ultimosPedidos[0].numeropedido.match(/P-(\d+)/);
      if (match) {
        nuevoNumero = parseInt(match[1]) + 1;
      }
    }

    return `P-${String(nuevoNumero).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error al generar número de pedido:', error);
    return `P-${String(Date.now()).slice(-3)}`;
  }
}

// Crear producción
exports.create = async (req, res) => {
  try {
    console.log('📦 Datos recibidos en el backend:', req.body);
    
    const { 
      TipoProduccion, 
      nombreproduccion,
      fechapedido, 
      fechaentrega,
      productos // ✅ Recibir los productos seleccionados
    } = req.body;

    // Validaciones
    if (!TipoProduccion) {
      return res.status(400).json({ message: 'El tipo de producción es requerido' });
    }

    if (!nombreproduccion || nombreproduccion.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la producción es requerido' });
    }

    let numeropedido = '';
    if (TipoProduccion.toLowerCase() === 'pedido') {
      numeropedido = await generarNumeroPedido();
    }

    const estadoproduccion = TipoProduccion.toLowerCase() === 'fabrica' ? 1 : 2;
    const estadopedido = TipoProduccion.toLowerCase() === 'pedido' ? 1 : null;

    // ✅ Usar transacción para crear producción Y sus detalles
    const nuevaProduccion = await prisma.$transaction(async (tx) => {
      // 1. Crear la producción
      const produccion = await tx.produccion.create({
        data: {
          TipoProduccion: TipoProduccion,
          nombreproduccion: nombreproduccion.trim(),
          fechapedido: fechapedido ? new Date(fechapedido) : new Date(),
          fechaentrega: fechaentrega && TipoProduccion.toLowerCase() === 'pedido' 
            ? new Date(fechaentrega) 
            : null,
          numeropedido: numeropedido,
          estadoproduccion: estadoproduccion,
          estadopedido: estadopedido
        }
      });

      // 2. Crear los detalles de producción (productos)
      if (productos && Array.isArray(productos) && productos.length > 0) {
        await tx.detalleproduccion.createMany({
          data: productos.map(prod => ({
            idproduccion: produccion.idproduccion,
            idproductogeneral: prod.id,
            cantidadproducto: prod.cantidad || 1
          }))
        });
      }

      // 3. Retornar la producción con sus detalles
      return await tx.produccion.findUnique({
        where: { idproduccion: produccion.idproduccion },
        include: {
          detalleproduccion: {
            include: {
              productogeneral: true
            }
          }
        }
      });
    });

    console.log('✅ Producción creada con detalles:', nuevaProduccion);
    res.status(201).json(nuevaProduccion);

  } catch (error) {
    console.error('❌ Error al crear producción:', error);
    res.status(500).json({ 
      message: 'Error al crear producción', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Actualizar producción
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      TipoProduccion,
      nombreproduccion,
      fechapedido, 
      fechaentrega, 
      numeropedido, 
      estadoproduccion 
    } = req.body;

    const produccionExiste = await prisma.produccion.findUnique({ 
      where: { idproduccion: id } 
    });
    
    if (!produccionExiste) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }

    const datosActualizacion = {};

    if (TipoProduccion !== undefined) datosActualizacion.TipoProduccion = TipoProduccion;
    if (nombreproduccion !== undefined) datosActualizacion.nombreproduccion = nombreproduccion.trim();
    if (fechapedido !== undefined) datosActualizacion.fechapedido = fechapedido ? new Date(fechapedido) : null;
    if (fechaentrega !== undefined) datosActualizacion.fechaentrega = fechaentrega ? new Date(fechaentrega) : null;
    if (numeropedido !== undefined) datosActualizacion.numeropedido = numeropedido;
    if (estadoproduccion !== undefined) datosActualizacion.estadoproduccion = estadoproduccion;

    const actualizada = await prisma.produccion.update({
      where: { idproduccion: id },
      data: datosActualizacion
    });

    res.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar producción:', error);
    res.status(500).json({ 
      message: 'Error al actualizar producción', 
      error: error.message 
    });
  }
};

// Eliminar producción
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const produccionExiste = await prisma.produccion.findUnique({ 
      where: { idproduccion: id } 
    });
    
    if (!produccionExiste) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }

    await prisma.produccion.delete({ where: { idproduccion: id } });
    res.json({ message: 'Producción eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar producción:', error);
    res.status(500).json({ 
      message: 'Error al eliminar producción', 
      error: error.message 
    });
  }
};