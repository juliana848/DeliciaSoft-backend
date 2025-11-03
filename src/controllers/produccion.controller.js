const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sumarInventario } = require('./inventariosede.controller');

// Función auxiliar para calcular insumos necesarios
async function calcularInsumosNecesarios(productos) {
  const insumosAgrupados = {};
  
  for (const producto of productos) {
    // Obtener producto con su receta completa
    const productoDB = await prisma.productogeneral.findUnique({
      where: { idproductogeneral: producto.id },
      include: {
        receta: {
          include: {
            detallereceta: {
              include: {
                insumos: true,
                unidadmedida: true
              }
            }
          }
        }
      }
    });

    if (!productoDB?.receta?.detallereceta) {
      console.warn(`⚠️ Producto ${producto.id} no tiene receta asociada`);
      continue;
    }

    // Calcular cantidad total según tipo de producción
    let cantidadTotal = 0;
    if (producto.cantidadesPorSede) {
      // Producción de fábrica
      cantidadTotal = Object.values(producto.cantidadesPorSede).reduce(
        (sum, cant) => sum + parseFloat(cant || 0), 
        0
      );
    } else {
      // Pedido
      cantidadTotal = parseFloat(producto.cantidad || 1);
    }

    // Multiplicar cada insumo por la cantidad total
    productoDB.receta.detallereceta.forEach(detalle => {
      const idinsumo = detalle.idinsumo;
      const cantidadPorUnidad = parseFloat(detalle.cantidad || 0);
      const cantidadNecesaria = cantidadPorUnidad * cantidadTotal;

      if (!insumosAgrupados[idinsumo]) {
        insumosAgrupados[idinsumo] = {
          idinsumo,
          nombreinsumo: detalle.insumos.nombreinsumo,
          cantidadNecesaria: 0,
          unidad: detalle.unidadmedida?.unidadmedida || 'unidad'
        };
      }

      insumosAgrupados[idinsumo].cantidadNecesaria += cantidadNecesaria;
    });
  }

  return Object.values(insumosAgrupados);
}

// Función para verificar disponibilidad de insumos
async function verificarDisponibilidadInsumos(insumosNecesarios) {
  const insuficientes = [];

  for (const insumo of insumosNecesarios) {
    const insumoDB = await prisma.insumos.findUnique({
      where: { idinsumo: insumo.idinsumo },
      select: { 
        idinsumo: true,
        nombreinsumo: true, 
        cantidad: true 
      }
    });

    if (!insumoDB) {
      insuficientes.push({
        ...insumo,
        disponible: 0,
        faltante: insumo.cantidadNecesaria
      });
      continue;
    }

    const disponible = parseFloat(insumoDB.cantidad || 0);
    
    if (disponible < insumo.cantidadNecesaria) {
      insuficientes.push({
        ...insumo,
        disponible,
        faltante: insumo.cantidadNecesaria - disponible
      });
    }
  }

  return insuficientes;
}

// Función para descontar insumos
async function descontarInsumos(insumosNecesarios, tx) {
  for (const insumo of insumosNecesarios) {
    await tx.insumos.update({
      where: { idinsumo: insumo.idinsumo },
      data: {
        cantidad: {
          decrement: insumo.cantidadNecesaria
        }
      }
    });
    
    console.log(
      `✅ Insumo descontado: ${insumo.nombreinsumo}, ` +
      `Cantidad: -${insumo.cantidadNecesaria.toFixed(2)} ${insumo.unidad}`
    );
  }
}

// Obtener todas las producciones
exports.getAll = async (req, res) => {
  try {
    const producciones = await prisma.produccion.findMany({
      include: {
        detalleproduccion: {
          include: {
            productogeneral: {
              include: {
                imagenes: { select: { urlimg: true } },
                receta: {
                  include: {
                    detallereceta: {
                      include: {
                        insumos: { select: { nombreinsumo: true, idinsumo: true } },
                        unidadmedida: { select: { unidadmedida: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { idproduccion: 'desc' }
    });

    const sedesDisponibles = await obtenerSedesActivas();

    const produccionesTransformadas = producciones.map(prod => {
      const productosMap = {};
      
      prod.detalleproduccion?.forEach(detalle => {
        const idProd = detalle.idproductogeneral;
        
        if (!productosMap[idProd]) {
          productosMap[idProd] = {
            id: idProd,
            nombre: detalle.productogeneral?.nombreproducto,
            imagen: detalle.productogeneral?.imagenes?.urlimg || null,
            cantidadTotal: 0,
            cantidadesPorSede: {},
            receta: detalle.productogeneral?.receta ? {
              id: detalle.productogeneral.receta.idreceta,
              nombre: detalle.productogeneral.receta.nombrereceta,
              especificaciones: detalle.productogeneral.receta.especificaciones,
              insumos: detalle.productogeneral.receta.detallereceta?.map(dr => ({
                id: dr.idinsumo,
                nombre: dr.insumos?.nombreinsumo,
                cantidad: parseFloat(dr.cantidad || 0),
                unidad: dr.unidadmedida?.unidadmedida
              })) || []
            } : null,
            insumos: detalle.productogeneral?.receta?.detallereceta?.map(dr => ({
              id: dr.idinsumo,
              nombre: dr.insumos?.nombreinsumo,
              cantidad: parseFloat(dr.cantidad || 0),
              unidad: dr.unidadmedida?.unidadmedida
            })) || []
          };
        }
        
        const cantidad = parseFloat(detalle.cantidadproducto || 0);
        productosMap[idProd].cantidadTotal += cantidad;
        
        if (detalle.sede) {
          if (!productosMap[idProd].cantidadesPorSede[detalle.sede]) {
            productosMap[idProd].cantidadesPorSede[detalle.sede] = 0;
          }
          productosMap[idProd].cantidadesPorSede[detalle.sede] += cantidad;
        }
      });

      return {
        ...prod,
        detalleproduccion: Object.values(productosMap),
        sedesDisponibles: sedesDisponibles.map(s => s.nombre)
      };
    });

    res.json(produccionesTransformadas);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ message: 'Error al obtener producciones', error: error.message });
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

// Obtener ID de sede por nombre
async function obtenerIdSedePorNombre(nombreSede) {
  try {
    const sede = await prisma.sede.findFirst({
      where: { 
        nombre: nombreSede,
        estado: true 
      },
      select: { idsede: true }
    });
    return sede?.idsede || null;
  } catch (error) {
    console.error('Error al obtener ID de sede:', error);
    return null;
  }
}

// CREAR PRODUCCIÓN CON ACTUALIZACIÓN DE INVENTARIO Y DESCUENTO DE INSUMOS
exports.create = async (req, res) => {
  try {
    console.log('📦 Datos recibidos en el backend:', req.body);
    
    const { 
      TipoProduccion, 
      nombreproduccion,
      fechapedido, 
      fechaentrega,
      productos
    } = req.body;

    if (!TipoProduccion || !nombreproduccion?.trim()) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    if (!productos || productos.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un producto' });
    }

    // ✅ PASO 1: CALCULAR INSUMOS NECESARIOS
    console.log('🔍 Calculando insumos necesarios...');
    const insumosNecesarios = await calcularInsumosNecesarios(productos);
    
    if (insumosNecesarios.length === 0) {
      console.warn('⚠️ No se encontraron insumos en las recetas');
    } else {
      console.log('📊 Insumos necesarios:', insumosNecesarios);
    }

    // ✅ PASO 2: VERIFICAR DISPONIBILIDAD (SOLO PARA FÁBRICA)
    if (TipoProduccion.toLowerCase() === 'fabrica' && insumosNecesarios.length > 0) {
      console.log('✔️ Verificando disponibilidad de insumos...');
      const insuficientes = await verificarDisponibilidadInsumos(insumosNecesarios);

      if (insuficientes.length > 0) {
        const detalles = insuficientes.map(ins => 
          `• ${ins.nombreinsumo}: Necesita ${ins.cantidadNecesaria.toFixed(2)} ${ins.unidad}, ` +
          `Disponible ${ins.disponible.toFixed(2)} ${ins.unidad}, ` +
          `Faltante ${ins.faltante.toFixed(2)} ${ins.unidad}`
        ).join('\n');

        return res.status(400).json({
          message: '❌ Insumos insuficientes para esta producción',
          tipo: 'INSUMOS_INSUFICIENTES',
          insuficientes: insuficientes,
          detalles: detalles
        });
      }
      console.log('✅ Todos los insumos están disponibles');
    }

    let numeropedido = '';
    if (TipoProduccion.toLowerCase() === 'pedido') {
      numeropedido = await generarNumeroPedido();
    }

    const estadoproduccion = TipoProduccion.toLowerCase() === 'fabrica' ? 1 : 2;
    const estadopedido = TipoProduccion.toLowerCase() === 'pedido' ? 1 : null;

    const nuevaProduccion = await prisma.$transaction(async (tx) => {
      // 1. Crear la producción
      const produccion = await tx.produccion.create({
        data: {
          TipoProduccion,
          nombreproduccion: nombreproduccion.trim(),
          fechapedido: fechapedido ? new Date(fechapedido) : new Date(),
          fechaentrega: fechaentrega && TipoProduccion.toLowerCase() === 'pedido' 
            ? new Date(fechaentrega) 
            : null,
          numeropedido,
          estadoproduccion,
          estadopedido
        }
      });

      // 2. Crear detalles y actualizar inventario
      if (productos && Array.isArray(productos) && productos.length > 0) {
        const detallesParaCrear = [];
        const inventariosActualizar = [];
        
        productos.forEach(prod => {
          if (TipoProduccion.toLowerCase() === 'fabrica' && prod.cantidadesPorSede) {
            // Producción de fábrica: crear un detalle por cada sede con cantidad
            Object.entries(prod.cantidadesPorSede).forEach(([nombreSede, cantidad]) => {
              if (cantidad && cantidad > 0) {
                detallesParaCrear.push({
                  idproduccion: produccion.idproduccion,
                  idproductogeneral: prod.id,
                  cantidadproducto: parseFloat(cantidad),
                  sede: nombreSede
                });
                
                inventariosActualizar.push({
                  idproductogeneral: prod.id,
                  nombreSede: nombreSede,
                  cantidad: parseFloat(cantidad)
                });
              }
            });
          } else {
            // Para pedido (no actualiza inventario)
            detallesParaCrear.push({
              idproduccion: produccion.idproduccion,
              idproductogeneral: prod.id,
              cantidadproducto: parseFloat(prod.cantidad || 1),
              sede: prod.sede || null
            });
          }
        });

        if (detallesParaCrear.length > 0) {
          await tx.detalleproduccion.createMany({
            data: detallesParaCrear
          });
        }

        // 3. ✅ DESCONTAR INSUMOS (SOLO PARA FÁBRICA)
        if (TipoProduccion.toLowerCase() === 'fabrica' && insumosNecesarios.length > 0) {
          console.log('🔻 Descontando insumos del inventario...');
          await descontarInsumos(insumosNecesarios, tx);
        }

        // 4. ACTUALIZAR INVENTARIO DE PRODUCTOS (SOLO PARA FÁBRICA)
        if (TipoProduccion.toLowerCase() === 'fabrica' && inventariosActualizar.length > 0) {
          console.log('📦 Actualizando inventario de productos por sede...');
          
          for (const item of inventariosActualizar) {
            const idsede = await obtenerIdSedePorNombre(item.nombreSede);
            
            if (!idsede) {
              console.warn(`⚠️ Sede "${item.nombreSede}" no encontrada, saltando actualización`);
              continue;
            }

            try {
              const inventarioExistente = await tx.inventariosede.findUnique({
                where: {
                  idproductogeneral_idsede: {
                    idproductogeneral: item.idproductogeneral,
                    idsede: idsede
                  }
                }
              });

              if (inventarioExistente) {
                await tx.inventariosede.update({
                  where: {
                    idproductogeneral_idsede: {
                      idproductogeneral: item.idproductogeneral,
                      idsede: idsede
                    }
                  },
                  data: {
                    cantidad: {
                      increment: item.cantidad
                    }
                  }
                });
                console.log(`✅ Inventario actualizado: Producto ${item.idproductogeneral}, Sede ${item.nombreSede}, +${item.cantidad}`);
              } else {
                await tx.inventariosede.create({
                  data: {
                    idproductogeneral: item.idproductogeneral,
                    idsede: idsede,
                    cantidad: item.cantidad
                  }
                });
                console.log(`✅ Inventario creado: Producto ${item.idproductogeneral}, Sede ${item.nombreSede}, ${item.cantidad}`);
              }
            } catch (invError) {
              console.error(`❌ Error actualizando inventario para producto ${item.idproductogeneral}:`, invError);
              throw invError;
            }
          }
        }
      }

      // 5. Retornar producción completa
      return await tx.produccion.findUnique({
        where: { idproduccion: produccion.idproduccion },
        include: {
          detalleproduccion: {
            include: {
              productogeneral: {
                include: {
                  imagenes: { select: { urlimg: true } },
                  receta: {
                    include: {
                      detallereceta: {
                        include: {
                          insumos: { select: { nombreinsumo: true, idinsumo: true } },
                          unidadmedida: { select: { unidadmedida: true } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    console.log('✅ Producción creada exitosamente:', nuevaProduccion);
    res.status(201).json(nuevaProduccion);

  } catch (error) {
    console.error('❌ Error al crear producción:', error);
    res.status(500).json({ 
      message: 'Error al crear producción', 
      error: error.message
    });
  }
};


// Actualizar producción completa
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    const produccionExiste = await prisma.produccion.findUnique({
      where: { idproduccion: id }
    });

    if (!produccionExiste) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }

    // Preparar datos para actualizar
    const datosActualizar = {};
    
    if (data.nombreproduccion) datosActualizar.nombreproduccion = data.nombreproduccion;
    if (data.fechapedido) datosActualizar.fechapedido = new Date(data.fechapedido);
    if (data.fechaentrega) datosActualizar.fechaentrega = new Date(data.fechaentrega);
    if (data.estadoproduccion !== undefined) datosActualizar.estadoproduccion = parseInt(data.estadoproduccion);
    if (data.estadopedido !== undefined) datosActualizar.estadopedido = parseInt(data.estadopedido);
    if (data.numeropedido) datosActualizar.numeropedido = data.numeropedido;

    const produccionActualizada = await prisma.produccion.update({
      where: { idproduccion: id },
      data: datosActualizar
    });

    console.log('✅ Producción actualizada:', produccionActualizada);
    res.json(produccionActualizada);

  } catch (error) {
    console.error('❌ Error al actualizar producción:', error);
    res.status(500).json({ 
      message: 'Error al actualizar producción', 
      error: error.message 
    });
  }
};

// Actualizar solo estados (PATCH)
exports.updateEstado = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estadoproduccion, estadopedido } = req.body;

    console.log(`🔄 Actualizando estados para producción ${id}:`, { estadoproduccion, estadopedido });

    const produccionExiste = await prisma.produccion.findUnique({
      where: { idproduccion: id }
    });

    if (!produccionExiste) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }

    // Preparar solo los estados que vienen en el request
    const datosActualizar = {};
    if (estadoproduccion !== undefined) {
      datosActualizar.estadoproduccion = parseInt(estadoproduccion);
    }
    if (estadopedido !== undefined) {
      datosActualizar.estadopedido = parseInt(estadopedido);
    }

    const produccionActualizada = await prisma.produccion.update({
      where: { idproduccion: id },
      data: datosActualizar
    });

    console.log('✅ Estados actualizados correctamente');
    res.json(produccionActualizada);

  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({ 
      message: 'Error al actualizar estado', 
      error: error.message 
    });
  }
};

// Eliminar producción (CORREGIDO - elimina detalles primero)
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    console.log(`🗑️ Intentando eliminar producción con ID: ${id}`);

    const produccionExiste = await prisma.produccion.findUnique({ 
      where: { idproduccion: id },
      include: {
        detalleproduccion: true
      }
    });
    
    if (!produccionExiste) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }

    // 🔥 SOLUCIÓN: Usar transacción para eliminar detalles primero
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar todos los detalles de producción
      await tx.detalleproduccion.deleteMany({
        where: { idproduccion: id }
      });
      console.log(`✅ Detalles eliminados: ${produccionExiste.detalleproduccion.length}`);

      // 2. Eliminar la producción
      await tx.produccion.delete({ 
        where: { idproduccion: id } 
      });
      console.log('✅ Producción eliminada');
    });

    res.json({ 
      success: true,
      message: 'Producción eliminada correctamente' 
    });

  } catch (error) {
    console.error('❌ Error al eliminar producción:', error);
    res.status(500).json({ 
      message: 'Error al eliminar producción', 
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

async function obtenerSedesActivas() {
  try {
    const sedes = await prisma.sede.findMany({
      where: { estado: true },
      select: {
        idsede: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    });
    return sedes;
  } catch (error) {
    console.error('Error obteniendo sedes:', error);
    return [];
  }
}