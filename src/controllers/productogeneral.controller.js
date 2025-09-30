const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los productos generales con relaciones
exports.getAll = async (req, res) => {
  try {
    console.log('📋 Obteniendo todos los productos con recetas...');
    
    const productos = await prisma.productogeneral.findMany({
      include: {
        categoriaproducto: {
          select: {
            nombrecategoria: true
          }
        },
        imagenes: {
          select: {
            urlimg: true
          }
        },
        receta: {
          select: {
            idreceta: true,
            nombrereceta: true,
            especificaciones: true,
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
      },
      orderBy: {
        idproductogeneral: 'desc'
      }
    });

    console.log(`✅ Se encontraron ${productos.length} productos`);

    const productosTransformados = productos.map(producto => {
      // Transformar insumos de receta si existe
      const insumosReceta = producto.receta?.detallereceta?.map(detalle => ({
        id: detalle.idinsumo,
        nombre: detalle.insumos?.nombreinsumo || 'Sin nombre',
        cantidad: parseFloat(detalle.cantidad || 0),
        unidad: detalle.unidadmedida?.unidadmedida || 'unidad'
      })) || [];

      return {
        ...producto,
        categoria: producto.categoriaproducto?.nombrecategoria || 'Sin categoría',
        urlimagen: producto.imagenes?.urlimg || null,
        nombrereceta: producto.receta?.nombrereceta || null,
        especificacionesreceta: producto.receta?.especificaciones || null,
        // Agregar información completa de receta
        receta: producto.receta ? {
          id: producto.receta.idreceta,
          nombre: producto.receta.nombrereceta,
          especificaciones: producto.receta.especificaciones,
          insumos: insumosReceta,
          pasos: [] // Si tienes pasos de preparación en tu BD, agrégalos aquí
        } : null
      };
    });

    res.json(productosTransformados);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ 
      message: 'Error al obtener productos', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Obtener producto general por id con relaciones
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🔍 Buscando producto con ID: ${id}`);

    const producto = await prisma.productogeneral.findUnique({
      where: { idproductogeneral: id },
      include: {
        categoriaproducto: {
          select: {
            nombrecategoria: true // ✅ Cambiado
          }
        },
        imagenes: {
          select: {
            urlimg: true
          }
        },
        receta: {
          select: {
            nombrereceta: true,
            especificaciones: true
          }
        }
      }
    });

    if (!producto) {
      return res.status(404).json({ 
        message: `No se encontró el producto con ID: ${id}` 
      });
    }

    // Transformar datos para el frontend
    const productoTransformado = {
      ...producto,
      categoria: producto.categoriaproducto?.nombrecategoria || 'Sin categoría', // ✅ Actualizado
      urlimagen: producto.imagenes?.urlimg || null,
      nombrereceta: producto.receta?.nombrereceta || null,
      especificacionesreceta: producto.receta?.especificaciones || null
    };

    console.log(`✅ Producto encontrado: ${producto.nombreproducto}`);
    res.json(productoTransformado);
  } catch (error) {
    console.error('❌ Error al obtener producto por ID:', error);
    res.status(500).json({ 
      message: 'Error al obtener producto', 
      error: error.message 
    });
  }
};

// Crear producto general con validaciones mejoradas
exports.create = async (req, res) => {
  try {
    console.log('🚀 Creando nuevo producto...');
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));

    const {
      nombreproducto,
      precioproducto,
      cantidadproducto,
      estado,
      idcategoriaproducto,
      idimagen,
      idreceta
    } = req.body;

    // Validaciones de entrada
    const errores = [];

    if (!nombreproducto || !nombreproducto.trim()) {
      errores.push('El nombre del producto es requerido');
    }

    if (precioproducto === undefined || precioproducto === null) {
      errores.push('El precio del producto es requerido');
    } else {
      const precio = parseFloat(precioproducto);
      if (isNaN(precio) || precio < 0) {
        errores.push('El precio debe ser un número válido mayor o igual a 0');
      }
    }

    if (cantidadproducto === undefined || cantidadproducto === null) {
      errores.push('La cantidad del producto es requerida');
    } else {
      const cantidad = parseFloat(cantidadproducto);
      if (isNaN(cantidad) || cantidad < 0) {
        errores.push('La cantidad debe ser un número válido mayor o igual a 0');
      }
    }

    if (!idcategoriaproducto) {
      errores.push('La categoría del producto es requerida');
    } else {
      const categoriaId = parseInt(idcategoriaproducto);
      if (isNaN(categoriaId) || categoriaId <= 0) {
        errores.push('ID de categoría inválido');
      }
    }

    if (errores.length > 0) {
      console.log('❌ Errores de validación:', errores);
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errores: errores
      });
    }

    // Verificar que la categoría existe
    if (idcategoriaproducto) {
      const categoriaExiste = await prisma.categoriaproducto.findUnique({
        where: { idcategoriaproducto: parseInt(idcategoriaproducto) }
      });

      if (!categoriaExiste) {
        return res.status(400).json({
          message: `La categoría con ID ${idcategoriaproducto} no existe`
        });
      }
    }

    // Verificar que la imagen existe (si se proporciona)
    if (idimagen) {
      const imagenExiste = await prisma.imagenes.findUnique({
        where: { idimagen: parseInt(idimagen) }
      });

      if (!imagenExiste) {
        return res.status(400).json({
          message: `La imagen con ID ${idimagen} no existe`
        });
      }
    }

    // Verificar que la receta existe (si se proporciona)
    if (idreceta) {
      const recetaExiste = await prisma.receta.findUnique({
        where: { idreceta: parseInt(idreceta) }
      });

      if (!recetaExiste) {
        return res.status(400).json({
          message: `La receta con ID ${idreceta} no existe`
        });
      }
    }

    // Crear el producto
    const datosProducto = {
      nombreproducto: nombreproducto.trim(),
      precioproducto: parseFloat(precioproducto),
      cantidadproducto: parseFloat(cantidadproducto),
      estado: Boolean(estado),
      idcategoriaproducto: parseInt(idcategoriaproducto),
      idimagen: idimagen ? parseInt(idimagen) : null,
      idreceta: idreceta ? parseInt(idreceta) : null
    };

    console.log('💾 Guardando producto con datos:', JSON.stringify(datosProducto, null, 2));

    const nuevoProducto = await prisma.productogeneral.create({
      data: datosProducto,
      include: {
        categoriaproducto: {
          select: {
            nombrecategoria: true // ✅ Cambiado
          }
        },
        imagenes: {
          select: {
            urlimg: true
          }
        },
        receta: {
          select: {
            nombrereceta: true,
            especificaciones: true
          }
        }
      }
    });

    // Transformar respuesta
    const productoRespuesta = {
      ...nuevoProducto,
      categoria: nuevoProducto.categoriaproducto?.nombrecategoria || 'Sin categoría', // ✅ Actualizado
      urlimagen: nuevoProducto.imagenes?.urlimg || null,
      nombrereceta: nuevoProducto.receta?.nombrereceta || null,
      especificacionesreceta: nuevoProducto.receta?.especificaciones || null
    };

    console.log('✅ Producto creado exitosamente:', nuevoProducto.nombreproducto);

    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: productoRespuesta
    });

  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    
    // Errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Ya existe un producto con ese nombre',
        error: 'Nombre duplicado'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        message: 'Referencia inválida a categoría, imagen o receta',
        error: 'Clave foránea inválida'
      });
    }

    res.status(500).json({ 
      message: 'Error interno al crear producto', 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
};

// Actualizar producto general
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🔄 Actualizando producto ID: ${id}`);
    console.log('📦 Datos para actualizar:', JSON.stringify(req.body, null, 2));

    const {
      nombreproducto,
      precioproducto,
      cantidadproducto,
      estado,
      idcategoriaproducto,
      idimagen,
      idreceta
    } = req.body;

    // Verificar que el producto existe
    const productoExiste = await prisma.productogeneral.findUnique({ 
      where: { idproductogeneral: id } 
    });

    if (!productoExiste) {
      return res.status(404).json({ 
        message: `No se encontró el producto con ID: ${id}` 
      });
    }

    // Preparar datos para actualización
    const datosActualizacion = {};

    if (nombreproducto !== undefined) {
      if (!nombreproducto.trim()) {
        return res.status(400).json({ 
          message: 'El nombre del producto no puede estar vacío' 
        });
      }
      datosActualizacion.nombreproducto = nombreproducto.trim();
    }

    if (precioproducto !== undefined) {
      const precio = parseFloat(precioproducto);
      if (isNaN(precio) || precio < 0) {
        return res.status(400).json({ 
          message: 'El precio debe ser un número válido mayor o igual a 0' 
        });
      }
      datosActualizacion.precioproducto = precio;
    }

    if (cantidadproducto !== undefined) {
      const cantidad = parseFloat(cantidadproducto);
      if (isNaN(cantidad) || cantidad < 0) {
        return res.status(400).json({ 
          message: 'La cantidad debe ser un número válido mayor o igual a 0' 
        });
      }
      datosActualizacion.cantidadproducto = cantidad;
    }

    if (estado !== undefined) {
      datosActualizacion.estado = Boolean(estado);
    }

    if (idcategoriaproducto !== undefined) {
      if (idcategoriaproducto) {
        const categoriaId = parseInt(idcategoriaproducto);
        if (isNaN(categoriaId) || categoriaId <= 0) {
          return res.status(400).json({ 
            message: 'ID de categoría inválido' 
          });
        }
        
        // Verificar que la categoría existe
        const categoriaExiste = await prisma.categoriaproducto.findUnique({
          where: { idcategoriaproducto: categoriaId }
        });

        if (!categoriaExiste) {
          return res.status(400).json({
            message: `La categoría con ID ${categoriaId} no existe`
          });
        }
        
        datosActualizacion.idcategoriaproducto = categoriaId;
      } else {
        datosActualizacion.idcategoriaproducto = null;
      }
    }

    if (idimagen !== undefined) {
      if (idimagen) {
        const imagenExiste = await prisma.imagenes.findUnique({
          where: { idimagen: parseInt(idimagen) }
        });

        if (!imagenExiste) {
          return res.status(400).json({
            message: `La imagen con ID ${idimagen} no existe`
          });
        }
        
        datosActualizacion.idimagen = parseInt(idimagen);
      } else {
        datosActualizacion.idimagen = null;
      }
    }

    if (idreceta !== undefined) {
      if (idreceta) {
        const recetaExiste = await prisma.receta.findUnique({
          where: { idreceta: parseInt(idreceta) }
        });

        if (!recetaExiste) {
          return res.status(400).json({
            message: `La receta con ID ${idreceta} no existe`
          });
        }
        
        datosActualizacion.idreceta = parseInt(idreceta);
      } else {
        datosActualizacion.idreceta = null;
      }
    }

    // Realizar la actualización
    const productoActualizado = await prisma.productogeneral.update({
      where: { idproductogeneral: id },
      data: datosActualizacion,
      include: {
        categoriaproducto: {
          select: {
            nombrecategoria: true // ✅ Cambiado
          }
        },
        imagenes: {
          select: {
            urlimg: true
          }
        },
        receta: {
          select: {
            nombrereceta: true,
            especificaciones: true
          }
        }
      }
    });

    // Transformar respuesta
    const productoRespuesta = {
      ...productoActualizado,
      categoria: productoActualizado.categoriaproducto?.nombrecategoria || 'Sin categoría', // ✅ Actualizado
      urlimagen: productoActualizado.imagenes?.urlimg || null,
      nombrereceta: productoActualizado.receta?.nombrereceta || null,
      especificacionesreceta: productoActualizado.receta?.especificaciones || null
    };

    console.log(`✅ Producto actualizado: ${productoActualizado.nombreproducto}`);

    res.json({
      message: 'Producto actualizado exitosamente',
      producto: productoRespuesta
    });

  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    res.status(500).json({ 
      message: 'Error al actualizar producto', 
      error: error.message 
    });
  }
};

// Eliminar producto general
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🗑️ Eliminando producto ID: ${id}`);

    const productoExiste = await prisma.productogeneral.findUnique({ 
      where: { idproductogeneral: id },
      select: { 
        nombreproducto: true,
        idproductogeneral: true
      }
    });

    if (!productoExiste) {
      return res.status(404).json({ 
        message: `No se encontró el producto con ID: ${id}` 
      });
    }

    // Eliminar el producto
    await prisma.productogeneral.delete({ 
      where: { idproductogeneral: id } 
    });

    console.log(`✅ Producto eliminado: ${productoExiste.nombreproducto}`);

    res.json({ 
      message: 'Producto eliminado correctamente',
      productoEliminado: {
        id: productoExiste.idproductogeneral,
        nombre: productoExiste.nombreproducto
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    
    // Error de integridad referencial
    if (error.code === 'P2003') {
      return res.status(400).json({
        message: 'No se puede eliminar el producto porque está siendo usado en otras partes del sistema',
        error: 'Restricción de integridad referencial'
      });
    }

    res.status(500).json({ 
      message: 'Error al eliminar producto', 
      error: error.message 
    });
  }
};

// Cambiar estado del producto (activar/desactivar)
exports.toggleEstado = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🔄 Cambiando estado del producto ID: ${id}`);

    const producto = await prisma.productogeneral.findUnique({ 
      where: { idproductogeneral: id },
      select: { 
        estado: true, 
        nombreproducto: true 
      }
    });

    if (!producto) {
      return res.status(404).json({ 
        message: `No se encontró el producto con ID: ${id}` 
      });
    }

    const nuevoEstado = !producto.estado;

    const productoActualizado = await prisma.productogeneral.update({
      where: { idproductogeneral: id },
      data: { estado: nuevoEstado },
      select: { 
        idproductogeneral: true,
        nombreproducto: true,
        estado: true 
      }
    });

    console.log(`✅ Estado cambiado para ${producto.nombreproducto}: ${nuevoEstado ? 'Activo' : 'Inactivo'}`);

    res.json({
      message: `Producto ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      producto: productoActualizado
    });

  } catch (error) {
    console.error('❌ Error al cambiar estado:', error);
    res.status(500).json({ 
      message: 'Error al cambiar estado del producto', 
      error: error.message 
    });
  }
};

exports.getProductosMasVendidos = async (req, res) => {
  try {
    console.log('🏆 Obteniendo productos más vendidos...');
    
    const limit = parseInt(req.query.limit) || 6; // Por defecto 6 productos
    
    // Obtener productos más vendidos basado en detalles de venta
    const productosMasVendidos = await prisma.detalleventa.groupBy({
      by: ['idproductogeneral'],
      _sum: {
        cantidad: true
      },
      _count: {
        iddetalleventa: true
      },
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: limit
    });

    console.log('Productos agrupados por ventas:', productosMasVendidos);

    // Si no hay ventas, obtener productos activos aleatorios
    if (productosMasVendidos.length === 0) {
      console.log('No hay ventas registradas, obteniendo productos activos...');
      const productosAleatorios = await prisma.productogeneral.findMany({
        where: { estado: true },
        include: {
          categoriaproducto: {
            select: {
              nombrecategoria: true
            }
          },
          imagenes: {
            select: {
              urlimg: true
            }
          },
          receta: {
            select: {
              nombrereceta: true,
              especificaciones: true
            }
          }
        },
        take: limit,
        orderBy: {
          idproductogeneral: 'desc'
        }
      });

      const productosTransformados = productosAleatorios.map(producto => ({
        ...producto,
        categoria: producto.categoriaproducto?.nombrecategoria || 'Sin categoría',
        urlimagen: producto.imagenes?.urlimg || null,
        nombrereceta: producto.receta?.nombrereceta || null,
        especificacionesreceta: producto.receta?.especificaciones || null,
        totalVendido: 0,
        vecesVendido: 0,
        esDestacado: true
      }));

      return res.json({
        message: 'Productos destacados (sin ventas registradas)',
        productos: productosTransformados
      });
    }

    // Obtener detalles completos de los productos más vendidos
    const idsProductos = productosMasVendidos.map(p => p.idproductogeneral);
    
    const productosCompletos = await prisma.productogeneral.findMany({
      where: { 
        idproductogeneral: { in: idsProductos },
        estado: true // Solo productos activos
      },
      include: {
        categoriaproducto: {
          select: {
            nombrecategoria: true
          }
        },
        imagenes: {
          select: {
            urlimg: true
          }
        },
        receta: {
          select: {
            nombrereceta: true,
            especificaciones: true
          }
        }
      }
    });

    // Combinar datos de ventas con detalles del producto
    const productosDestacados = productosMasVendidos.map(ventaData => {
      const producto = productosCompletos.find(p => p.idproductogeneral === ventaData.idproductogeneral);
      
      if (!producto) return null;
      
      return {
        ...producto,
        categoria: producto.categoriaproducto?.nombrecategoria || 'Sin categoría',
        urlimagen: producto.imagenes?.urlimg || null,
        nombrereceta: producto.receta?.nombrereceta || null,
        especificacionesreceta: producto.receta?.especificaciones || null,
        totalVendido: ventaData._sum.cantidad || 0,
        vecesVendido: ventaData._count.iddetalleventa || 0,
        esDestacado: true
      };
    }).filter(Boolean);

    console.log(`✅ ${productosDestacados.length} productos más vendidos encontrados`);

    res.json({
      message: 'Productos más vendidos obtenidos exitosamente',
      productos: productosDestacados
    });

  } catch (error) {
    console.error('❌ Error al obtener productos más vendidos:', error);
    res.status(500).json({ 
      message: 'Error al obtener productos más vendidos', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Obtener estadísticas de productos más vendidos
exports.getEstadisticasVentas = async (req, res) => {
  try {
    console.log('📈 Generando estadísticas de ventas de productos...');

    const fechaInicio = req.query.fechaInicio ? new Date(req.query.fechaInicio) : null;
    const fechaFin = req.query.fechaFin ? new Date(req.query.fechaFin) : null;
    
    let whereCondition = {};
    
    if (fechaInicio && fechaFin) {
      whereCondition = {
        venta: {
          fechaventa: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      };
    }

    const [
      totalVentas,
      ventasPorProducto,
      ingresosPorProducto
    ] = await Promise.all([
      // Total de productos vendidos
      prisma.detalleventa.aggregate({
        where: whereCondition,
        _sum: { cantidad: true },
        _count: { iddetalleventa: true }
      }),
      
      // Ventas por producto (cantidad)
      prisma.detalleventa.groupBy({
        by: ['idproductogeneral'],
        where: whereCondition,
        _sum: { cantidad: true },
        _count: { iddetalleventa: true },
        orderBy: { _sum: { cantidad: 'desc' } },
        take: 10
      }),
      
      // Ingresos por producto
      prisma.detalleventa.groupBy({
        by: ['idproductogeneral'],
        where: whereCondition,
        _sum: { subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 10
      })
    ]);

    const estadisticas = {
      resumen: {
        totalProductosVendidos: totalVentas._sum.cantidad || 0,
        totalTransacciones: totalVentas._count.iddetalleventa || 0,
        fechaConsulta: fechaInicio && fechaFin ? { inicio: fechaInicio, fin: fechaFin } : 'Histórico'
      },
      topVentasCantidad: ventasPorProducto,
      topVentasIngresos: ingresosPorProducto
    };

    console.log('✅ Estadísticas generadas:', estadisticas.resumen);
    res.json(estadisticas);

  } catch (error) {
    console.error('❌ Error al generar estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas de ventas', 
      error: error.message 
    });
  }
};

// Obtener estadísticas básicas de productos
exports.getEstadisticas = async (req, res) => {
  try {
    console.log('📊 Generando estadísticas de productos...');

    const [totalProductos, productosActivos, productosInactivos, categorias] = await Promise.all([
      prisma.productogeneral.count(),
      prisma.productogeneral.count({ where: { estado: true } }),
      prisma.productogeneral.count({ where: { estado: false } }),
      prisma.productogeneral.groupBy({
        by: ['idcategoriaproducto'],
        _count: {
          idproductogeneral: true
        }
      })
    ]);

    // Para obtener los nombres de categorías, necesitamos hacer consultas adicionales
    const categoriasConNombres = await Promise.all(
      categorias.map(async (cat) => {
        if (cat.idcategoriaproducto) {
          const categoria = await prisma.categoriaproducto.findUnique({
            where: { idcategoriaproducto: cat.idcategoriaproducto },
            select: { nombrecategoria: true } // ✅ Cambiado
          });
          return {
            ...cat,
            nombreCategoria: categoria?.nombrecategoria || 'Sin nombre'
          };
        }
        return {
          ...cat,
          nombreCategoria: 'Sin categoría'
        };
      })
    );

    const estadisticas = {
      totalProductos,
      productosActivos,
      productosInactivos,
      porcentajeActivos: totalProductos > 0 ? ((productosActivos / totalProductos) * 100).toFixed(2) : 0,
      productosPorCategoria: categoriasConNombres
    };

    console.log('✅ Estadísticas generadas:', estadisticas);
    res.json(estadisticas);

  } catch (error) {
    console.error('❌ Error al generar estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas', 
      error: error.message 
    });
  }
};