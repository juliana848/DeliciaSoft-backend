const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las recetas con sus insumos
exports.getAll = async (req, res) => {
  try {
    console.log('📋 Obteniendo todas las recetas...');
    
    const recetas = await prisma.receta.findMany({
      include: {
        detallereceta: {
          include: {
            insumos: {
              select: {
                nombreinsumo: true,
                categoriainsumos: {
                  select: {
                    nombrecategoria: true
                  }
                }
              }
            },
            unidadmedida: {
              select: {
                unidadmedida: true,
                formademedir: true
              }
            }
          }
        }
      },
      orderBy: {
        idreceta: 'desc'
      }
    });

    console.log(`✅ Se encontraron ${recetas.length} recetas`);

    // Transformar datos para el frontend
    const recetasTransformadas = recetas.map(receta => ({
      idreceta: receta.idreceta,
      nombrereceta: receta.nombrereceta,
      especificaciones: receta.especificaciones,
      cantidadInsumos: receta.detallereceta.length,
      insumos: receta.detallereceta.map(detalle => ({
        iddetallereceta: detalle.iddetallereceta,
        idinsumo: detalle.idinsumo,
        nombreinsumo: detalle.insumos?.nombreinsumo || 'Insumo no encontrado',
        cantidad: detalle.cantidad,
        idunidadmedida: detalle.idunidadmedida,
        unidadmedida: detalle.unidadmedida?.unidadmedida || 'Unidad',
        formademedir: detalle.unidadmedida?.formademedir || 'Por unidad',
        categoria: detalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
      }))
    }));

    res.json(recetasTransformadas);
  } catch (error) {
    console.error('❌ Error al obtener recetas:', error);
    res.status(500).json({ 
      message: 'Error al obtener recetas', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Obtener receta por id con sus insumos
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🔍 Buscando receta con ID: ${id}`);

    const receta = await prisma.receta.findUnique({
      where: { idreceta: id },
      include: {
        detallereceta: {
          include: {
            insumos: {
              select: {
                nombreinsumo: true,
                categoriainsumos: {
                  select: {
                    nombrecategoria: true
                  }
                }
              }
            },
            unidadmedida: {
              select: {
                unidadmedida: true,
                formademedir: true
              }
            }
          }
        }
      }
    });

    if (!receta) {
      return res.status(404).json({ 
        message: `No se encontró la receta con ID: ${id}` 
      });
    }

    // Transformar datos para el frontend
    const recetaTransformada = {
      idreceta: receta.idreceta,
      nombrereceta: receta.nombrereceta,
      especificaciones: receta.especificaciones,
      cantidadInsumos: receta.detallereceta.length,
      insumos: receta.detallereceta.map(detalle => ({
        iddetallereceta: detalle.iddetallereceta,
        idinsumo: detalle.idinsumo,
        nombreinsumo: detalle.insumos?.nombreinsumo || 'Insumo no encontrado',
        cantidad: detalle.cantidad,
        idunidadmedida: detalle.idunidadmedida,
        unidadmedida: detalle.unidadmedida?.unidadmedida || 'Unidad',
        formademedir: detalle.unidadmedida?.formademedir || 'Por unidad',
        categoria: detalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
      }))
    };

    console.log(`✅ Receta encontrada: ${receta.nombrereceta}`);
    res.json(recetaTransformada);
  } catch (error) {
    console.error('❌ Error al obtener receta por ID:', error);
    res.status(500).json({ 
      message: 'Error al obtener receta', 
      error: error.message 
    });
  }
};

// Crear receta con sus insumos
exports.create = async (req, res) => {
  try {
    console.log('🚀 Creando nueva receta...');
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));

    const { nombrereceta, especificaciones, insumos } = req.body;

    // Validaciones de entrada
    const errores = [];

    if (!nombrereceta || !nombrereceta.trim()) {
      errores.push('El nombre de la receta es requerido');
    }

    if (nombrereceta && nombrereceta.trim().length > 50) {
      errores.push('El nombre de la receta no puede exceder 50 caracteres');
    }

    if (especificaciones && especificaciones.length > 80) {
      errores.push('Las especificaciones no pueden exceder 80 caracteres');
    }

    if (errores.length > 0) {
      console.log('❌ Errores de validación:', errores);
      return res.status(400).json({
        message: 'Datos de entrada inválidos',
        errores: errores
      });
    }

    // Usar transacción para crear receta e insumos
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Crear la receta base
      const recetaCreada = await prisma.receta.create({
        data: {
          nombrereceta: nombrereceta.trim(),
          especificaciones: especificaciones?.trim() || "Sin especificaciones"
        }
      });

      console.log('📝 Receta base creada:', recetaCreada);

      // 2. Crear detalles de receta (insumos) si existen
      let detallesCreados = [];
      
      if (insumos && Array.isArray(insumos) && insumos.length > 0) {
        console.log(`➕ Agregando ${insumos.length} insumos...`);
        
        for (const insumo of insumos) {
          // Validar cada insumo
          if (!insumo.id && !insumo.idinsumo) {
            throw new Error(`Insumo "${insumo.nombre || 'Desconocido'}" no tiene ID válido`);
          }

          const cantidad = parseFloat(insumo.cantidad);
          if (isNaN(cantidad) || cantidad <= 0) {
            throw new Error(`Insumo "${insumo.nombre || 'Desconocido'}" debe tener una cantidad válida mayor a 0`);
          }

          // Verificar que el insumo existe
          const insumoExiste = await prisma.insumos.findUnique({
            where: { idinsumo: insumo.id || insumo.idinsumo }
          });

          if (!insumoExiste) {
            throw new Error(`El insumo con ID ${insumo.id || insumo.idinsumo} no existe`);
          }

          // Verificar que la unidad de medida existe
          if (insumo.idunidadmedida) {
            const unidadExiste = await prisma.unidadmedida.findUnique({
              where: { idunidadmedida: parseInt(insumo.idunidadmedida) }
            });

            if (!unidadExiste) {
              throw new Error(`La unidad de medida con ID ${insumo.idunidadmedida} no existe`);
            }
          }

          // Crear detalle de receta
          const detalleCreado = await prisma.detallereceta.create({
            data: {
              idreceta: recetaCreada.idreceta,
              idinsumo: insumo.id || insumo.idinsumo,
              cantidad: cantidad,
              idunidadmedida: insumo.idunidadmedida ? parseInt(insumo.idunidadmedida) : 1
            },
            include: {
              insumos: {
                select: {
                  nombreinsumo: true,
                  categoriainsumos: {
                    select: {
                      nombrecategoria: true
                    }
                  }
                }
              },
              unidadmedida: {
                select: {
                  unidadmedida: true,
                  formademedir: true
                }
              }
            }
          });

          detallesCreados.push(detalleCreado);
          console.log('✅ Detalle creado para insumo:', insumoExiste.nombreinsumo);
        }
      }

      return { recetaCreada, detallesCreados };
    });

    // Transformar respuesta
    const recetaRespuesta = {
      idreceta: result.recetaCreada.idreceta,
      nombrereceta: result.recetaCreada.nombrereceta,
      especificaciones: result.recetaCreada.especificaciones,
      cantidadInsumos: result.detallesCreados.length,
      insumos: result.detallesCreados.map(detalle => ({
        iddetallereceta: detalle.iddetallereceta,
        idinsumo: detalle.idinsumo,
        nombreinsumo: detalle.insumos?.nombreinsumo || 'Insumo no encontrado',
        cantidad: detalle.cantidad,
        idunidadmedida: detalle.idunidadmedida,
        unidadmedida: detalle.unidadmedida?.unidadmedida || 'Unidad',
        formademedir: detalle.unidadmedida?.formademedir || 'Por unidad',
        categoria: detalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
      }))
    };

    console.log('✅ Receta creada exitosamente:', result.recetaCreada.nombrereceta);

    res.status(201).json({
      message: 'Receta creada exitosamente',
      receta: recetaRespuesta
    });

  } catch (error) {
    console.error('❌ Error al crear receta:', error);
    
    // Errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Ya existe una receta con ese nombre',
        error: 'Nombre duplicado'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        message: 'Referencia inválida a insumo o unidad de medida',
        error: 'Clave foránea inválida'
      });
    }

    res.status(500).json({ 
      message: 'Error interno al crear receta', 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
};

// Actualizar receta con sus insumos
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🔄 Actualizando receta ID: ${id}`);
    console.log('📦 Datos para actualizar:', JSON.stringify(req.body, null, 2));

    const { nombrereceta, especificaciones, insumos } = req.body;

    // Verificar que la receta existe
    const recetaExiste = await prisma.receta.findUnique({ 
      where: { idreceta: id } 
    });

    if (!recetaExiste) {
      return res.status(404).json({ 
        message: `No se encontró la receta con ID: ${id}` 
      });
    }

    // Usar transacción para actualizar
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Actualizar datos base de la receta
      const recetaActualizada = await prisma.receta.update({
        where: { idreceta: id },
        data: {
          nombrereceta: nombrereceta?.trim() || recetaExiste.nombrereceta,
          especificaciones: especificaciones?.trim() || recetaExiste.especificaciones
        }
      });

      // 2. Si se proporcionan insumos, reemplazar todos los detalles
      let detallesCreados = [];
      
      if (insumos && Array.isArray(insumos)) {
        // Eliminar detalles existentes
        await prisma.detallereceta.deleteMany({
          where: { idreceta: id }
        });

        console.log('🗑️ Detalles anteriores eliminados');

        // Crear nuevos detalles
        if (insumos.length > 0) {
          console.log(`➕ Agregando ${insumos.length} nuevos insumos...`);
          
          for (const insumo of insumos) {
            // Validar cada insumo
            if (!insumo.id && !insumo.idinsumo) {
              throw new Error(`Insumo "${insumo.nombre || 'Desconocido'}" no tiene ID válido`);
            }

            const cantidad = parseFloat(insumo.cantidad);
            if (isNaN(cantidad) || cantidad <= 0) {
              throw new Error(`Insumo "${insumo.nombre || 'Desconocido'}" debe tener una cantidad válida mayor a 0`);
            }

            // Crear detalle de receta
            const detalleCreado = await prisma.detallereceta.create({
              data: {
                idreceta: id,
                idinsumo: insumo.id || insumo.idinsumo,
                cantidad: cantidad,
                idunidadmedida: insumo.idunidadmedida ? parseInt(insumo.idunidadmedida) : 1
              },
              include: {
                insumos: {
                  select: {
                    nombreinsumo: true,
                    categoriainsumos: {
                      select: {
                        nombrecategoria: true
                      }
                    }
                  }
                },
                unidadmedida: {
                  select: {
                    unidadmedida: true,
                    formademedir: true
                  }
                }
              }
            });

            detallesCreados.push(detalleCreado);
          }
        }
      } else {
        // Si no se proporcionan insumos, obtener los existentes
        detallesCreados = await prisma.detallereceta.findMany({
          where: { idreceta: id },
          include: {
            insumos: {
              select: {
                nombreinsumo: true,
                categoriainsumos: {
                  select: {
                    nombrecategoria: true
                  }
                }
              }
            },
            unidadmedida: {
              select: {
                unidadmedida: true,
                formademedir: true
              }
            }
          }
        });
      }

      return { recetaActualizada, detallesCreados };
    });

    // Transformar respuesta
    const recetaRespuesta = {
      idreceta: result.recetaActualizada.idreceta,
      nombrereceta: result.recetaActualizada.nombrereceta,
      especificaciones: result.recetaActualizada.especificaciones,
      cantidadInsumos: result.detallesCreados.length,
      insumos: result.detallesCreados.map(detalle => ({
        iddetallereceta: detalle.iddetallereceta,
        idinsumo: detalle.idinsumo,
        nombreinsumo: detalle.insumos?.nombreinsumo || 'Insumo no encontrado',
        cantidad: detalle.cantidad,
        idunidadmedida: detalle.idunidadmedida,
        unidadmedida: detalle.unidadmedida?.unidadmedida || 'Unidad',
        formademedir: detalle.unidadmedida?.formademedir || 'Por unidad',
        categoria: detalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
      }))
    };

    console.log(`✅ Receta actualizada: ${result.recetaActualizada.nombrereceta}`);

    res.json({
      message: 'Receta actualizada exitosamente',
      receta: recetaRespuesta
    });

  } catch (error) {
    console.error('❌ Error al actualizar receta:', error);
    res.status(500).json({ 
      message: 'Error al actualizar receta', 
      error: error.message 
    });
  }
};

// Eliminar receta y sus detalles
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: 'ID inválido. Debe ser un número.' 
      });
    }

    console.log(`🗑️ Eliminando receta ID: ${id}`);

    const recetaExiste = await prisma.receta.findUnique({ 
      where: { idreceta: id },
      select: { 
        nombrereceta: true,
        idreceta: true
      }
    });

    if (!recetaExiste) {
      return res.status(404).json({ 
        message: `No se encontró la receta con ID: ${id}` 
      });
    }

    // Usar transacción para eliminar receta y sus detalles
    await prisma.$transaction(async (prisma) => {
      // 1. Eliminar detalles de receta primero
      await prisma.detallereceta.deleteMany({ 
        where: { idreceta: id } 
      });

      // 2. Eliminar la receta
      await prisma.receta.delete({ 
        where: { idreceta: id } 
      });
    });

    console.log(`✅ Receta eliminada: ${recetaExiste.nombrereceta}`);

    res.json({ 
      message: 'Receta eliminada correctamente',
      recetaEliminada: {
        id: recetaExiste.idreceta,
        nombre: recetaExiste.nombrereceta
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar receta:', error);
    
    // Error de integridad referencial
    if (error.code === 'P2003') {
      return res.status(400).json({
        message: 'No se puede eliminar la receta porque está siendo usada en productos',
        error: 'Restricción de integridad referencial'
      });
    }

    res.status(500).json({ 
      message: 'Error al eliminar receta', 
      error: error.message 
    });
  }
};

// ========== CONTROLADORES PARA DETALLES DE RECETA ==========

// Obtener detalles de una receta específica
exports.getDetallesByReceta = async (req, res) => {
  try {
    const idReceta = parseInt(req.params.idReceta);
    
    if (isNaN(idReceta)) {
      return res.status(400).json({ 
        message: 'ID de receta inválido. Debe ser un número.' 
      });
    }

    console.log(`🔍 Obteniendo detalles de receta ID: ${idReceta}`);

    const detalles = await prisma.detallereceta.findMany({
      where: { idreceta: idReceta },
      include: {
        insumos: {
          select: {
            nombreinsumo: true,
            categoriainsumos: {
              select: {
                nombrecategoria: true
              }
            }
          }
        },
        unidadmedida: {
          select: {
            unidadmedida: true,
            formademedir: true
          }
        }
      },
      orderBy: {
        iddetallereceta: 'asc'
      }
    });

    // Transformar datos
    const detallesTransformados = detalles.map(detalle => ({
      iddetallereceta: detalle.iddetallereceta,
      idreceta: detalle.idreceta,
      idinsumo: detalle.idinsumo,
      nombreinsumo: detalle.insumos?.nombreinsumo || 'Insumo no encontrado',
      cantidad: detalle.cantidad,
      idunidadmedida: detalle.idunidadmedida,
      unidadmedida: detalle.unidadmedida?.unidadmedida || 'Unidad',
      formademedir: detalle.unidadmedida?.formademedir || 'Por unidad',
      categoria: detalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
    }));

    console.log(`✅ Se encontraron ${detalles.length} detalles`);
    res.json(detallesTransformados);

  } catch (error) {
    console.error('❌ Error al obtener detalles de receta:', error);
    res.status(500).json({ 
      message: 'Error al obtener detalles de receta', 
      error: error.message 
    });
  }
};

// Crear detalle de receta individual
exports.createDetalle = async (req, res) => {
  try {
    console.log('➕ Creando detalle de receta...');
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));

    const { idreceta, idinsumo, cantidad, idunidadmedida } = req.body;

    // Validaciones
    if (!idreceta || !idinsumo || !cantidad) {
      return res.status(400).json({
        message: 'Los campos idreceta, idinsumo y cantidad son requeridos'
      });
    }

    const cantidadFloat = parseFloat(cantidad);
    if (isNaN(cantidadFloat) || cantidadFloat <= 0) {
      return res.status(400).json({
        message: 'La cantidad debe ser un número válido mayor a 0'
      });
    }

    // Verificar que la receta existe
    const recetaExiste = await prisma.receta.findUnique({
      where: { idreceta: parseInt(idreceta) }
    });

    if (!recetaExiste) {
      return res.status(400).json({
        message: `La receta con ID ${idreceta} no existe`
      });
    }

    // Verificar que el insumo existe
    const insumoExiste = await prisma.insumos.findUnique({
      where: { idinsumo: parseInt(idinsumo) }
    });

    if (!insumoExiste) {
      return res.status(400).json({
        message: `El insumo con ID ${idinsumo} no existe`
      });
    }

    // Verificar que no existe ya este insumo en la receta
    const detalleExistente = await prisma.detallereceta.findFirst({
      where: {
        idreceta: parseInt(idreceta),
        idinsumo: parseInt(idinsumo)
      }
    });

    if (detalleExistente) {
      return res.status(400).json({
        message: `El insumo ${insumoExiste.nombreinsumo} ya está en esta receta`
      });
    }

    // Crear el detalle
    const nuevoDetalle = await prisma.detallereceta.create({
      data: {
        idreceta: parseInt(idreceta),
        idinsumo: parseInt(idinsumo),
        cantidad: cantidadFloat,
        idunidadmedida: idunidadmedida ? parseInt(idunidadmedida) : 1
      },
      include: {
        insumos: {
          select: {
            nombreinsumo: true,
            categoriainsumos: {
              select: {
                nombrecategoria: true
              }
            }
          }
        },
        unidadmedida: {
          select: {
            unidadmedida: true,
            formademedir: true
          }
        }
      }
    });

    // Transformar respuesta
    const detalleRespuesta = {
      iddetallereceta: nuevoDetalle.iddetallereceta,
      idreceta: nuevoDetalle.idreceta,
      idinsumo: nuevoDetalle.idinsumo,
      nombreinsumo: nuevoDetalle.insumos?.nombreinsumo || 'Insumo no encontrado',
      cantidad: nuevoDetalle.cantidad,
      idunidadmedida: nuevoDetalle.idunidadmedida,
      unidadmedida: nuevoDetalle.unidadmedida?.unidadmedida || 'Unidad',
      formademedir: nuevoDetalle.unidadmedida?.formademedir || 'Por unidad',
      categoria: nuevoDetalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
    };

    console.log('✅ Detalle de receta creado exitosamente');

    res.status(201).json({
      message: 'Detalle de receta creado exitosamente',
      detalle: detalleRespuesta
    });

  } catch (error) {
    console.error('❌ Error al crear detalle de receta:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Este insumo ya existe en la receta',
        error: 'Combinación duplicada'
      });
    }

    res.status(500).json({ 
      message: 'Error interno al crear detalle de receta', 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
};

// Eliminar todos los detalles de una receta
exports.removeDetallesByReceta = async (req, res) => {
  try {
    const idReceta = parseInt(req.params.idReceta);
    
    if (isNaN(idReceta)) {
      return res.status(400).json({ 
        message: 'ID de receta inválido. Debe ser un número.' 
      });
    }

    console.log(`🗑️ Eliminando detalles de receta ID: ${idReceta}`);

    const resultado = await prisma.detallereceta.deleteMany({
      where: { idreceta: idReceta }
    });

    console.log(`✅ Se eliminaron ${resultado.count} detalles`);

    res.json({
      message: `Se eliminaron ${resultado.count} detalles de la receta`,
      detallesEliminados: resultado.count
    });

  } catch (error) {
    console.error('❌ Error al eliminar detalles de receta:', error);
    res.status(500).json({ 
      message: 'Error al eliminar detalles de receta', 
      error: error.message 
    });
  }
};

// ========== MÉTODOS DE BÚSQUEDA Y FILTROS ==========

// Buscar recetas
exports.search = async (req, res) => {
  try {
    const { q, categoria, conInsumos } = req.query;
    
    console.log('🔍 Buscando recetas con filtros:', { q, categoria, conInsumos });

    let whereClause = {};

    // Filtro por nombre o especificaciones
    if (q && q.trim()) {
      whereClause.OR = [
        {
          nombrereceta: {
            contains: q.trim(),
            mode: 'insensitive'
          }
        },
        {
          especificaciones: {
            contains: q.trim(),
            mode: 'insensitive'
          }
        }
      ];
    }

    const recetas = await prisma.receta.findMany({
      where: whereClause,
      include: {
        detallereceta: {
          include: {
            insumos: {
              select: {
                nombreinsumo: true,
                categoriainsumos: {
                  select: {
                    nombrecategoria: true
                  }
                }
              }
            },
            unidadmedida: {
              select: {
                unidadmedida: true,
                formademedir: true
              }
            }
          }
        }
      },
      orderBy: {
        nombrereceta: 'asc'
      }
    });

    // Filtros adicionales en JavaScript
    let recetasFiltradas = recetas;

    // Filtrar por categoría de insumos
    if (categoria && categoria.trim() !== '') {
      recetasFiltradas = recetas.filter(receta =>
        receta.detallereceta.some(detalle =>
          detalle.insumos?.categoriainsumos?.nombrecategoria?.toLowerCase().includes(categoria.toLowerCase())
        )
      );
    }

    // Filtrar solo recetas con insumos
    if (conInsumos === 'true') {
      recetasFiltradas = recetasFiltradas.filter(receta => receta.detallereceta.length > 0);
    }

    // Transformar resultados
    const resultados = recetasFiltradas.map(receta => ({
      idreceta: receta.idreceta,
      nombrereceta: receta.nombrereceta,
      especificaciones: receta.especificaciones,
      cantidadInsumos: receta.detallereceta.length,
      insumos: receta.detallereceta.map(detalle => ({
        iddetallereceta: detalle.iddetallereceta,
        idinsumo: detalle.idinsumo,
        nombreinsumo: detalle.insumos?.nombreinsumo || 'Insumo no encontrado',
        cantidad: detalle.cantidad,
        idunidadmedida: detalle.idunidadmedida,
        unidadmedida: detalle.unidadmedida?.unidadmedida || 'Unidad',
        categoria: detalle.insumos?.categoriainsumos?.nombrecategoria || 'Sin categoría'
      }))
    }));

    console.log(`✅ Se encontraron ${resultados.length} recetas que coinciden con los filtros`);

    res.json({
      total: resultados.length,
      filtros: { q, categoria, conInsumos },
      recetas: resultados
    });

  } catch (error) {
    console.error('❌ Error en búsqueda de recetas:', error);
    res.status(500).json({ 
      message: 'Error al buscar recetas', 
      error: error.message 
    });
  }
};

// Obtener estadísticas de recetas
exports.getEstadisticas = async (req, res) => {
  try {
    console.log('📊 Generando estadísticas de recetas...');

    const [
      totalRecetas,
      recetasConInsumos,
      recetasSinInsumos,
      totalDetalles,
      insumosUnicos,
      unidadesMedida
    ] = await Promise.all([
      prisma.receta.count(),
      prisma.receta.count({
        where: {
          detallereceta: {
            some: {}
          }
        }
      }),
      prisma.receta.count({
        where: {
          detallereceta: {
            none: {}
          }
        }
      }),
      prisma.detallereceta.count(),
      prisma.detallereceta.groupBy({
        by: ['idinsumo'],
        _count: {
          idinsumo: true
        }
      }),
      prisma.detallereceta.groupBy({
        by: ['idunidadmedida'],
        _count: {
          idunidadmedida: true
        }
      })
    ]);

    const estadisticas = {
      totalRecetas,
      recetasConInsumos,
      recetasSinInsumos,
      porcentajeConInsumos: totalRecetas > 0 ? ((recetasConInsumos / totalRecetas) * 100).toFixed(2) : 0,
      totalDetalles,
      insumosUnicosUsados: insumosUnicos.length,
      unidadesMedidaUsadas: unidadesMedida.length,
      promedioInsumosPorReceta: recetasConInsumos > 0 ? (totalDetalles / recetasConInsumos).toFixed(2) : 0
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