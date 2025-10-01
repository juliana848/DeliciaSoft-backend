const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sumarInventario } = require('./inventariosede.controller');

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

    // Obtener todas las sedes para referencia
    const sedesDisponibles = await obtenerSedesActivas();

    const produccionesTransformadas = producciones.map(prod => {
      // Agrupar detalles por producto
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

// Crear producción CON ACTUALIZACIÓN DE INVENTARIO
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
        const inventariosActualizar = []; // Para actualizar inventario después
        
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
                
                // Agregar a lista de inventarios a actualizar
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

        // 3. ACTUALIZAR INVENTARIO SOLO PARA PRODUCCIÓN DE FÁBRICA
        if (TipoProduccion.toLowerCase() === 'fabrica' && inventariosActualizar.length > 0) {
          console.log('🔄 Actualizando inventario por sede...');
          
          for (const item of inventariosActualizar) {
            // Obtener ID de la sede
            const idsede = await obtenerIdSedePorNombre(item.nombreSede);
            
            if (!idsede) {
              console.warn(`⚠️ Sede "${item.nombreSede}" no encontrada, saltando actualización de inventario`);
              continue;
            }

            try {
              // Buscar si ya existe inventario
              const inventarioExistente = await tx.inventariosede.findUnique({
                where: {
                  idproductogeneral_idsede: {
                    idproductogeneral: item.idproductogeneral,
                    idsede: idsede
                  }
                }
              });

              if (inventarioExistente) {
                // Actualizar sumando la cantidad
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
                // Crear nuevo registro de inventario
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
              throw invError; // Revertir transacción si falla
            }
          }
        }
      }

      // 4. Retornar producción completa
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

    console.log('✅ Producción creada con inventario actualizado:', nuevaProduccion);
    res.status(201).json(nuevaProduccion);

  } catch (error) {
    console.error('❌ Error al crear producción:', error);
    res.status(500).json({ 
      message: 'Error al crear producción', 
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