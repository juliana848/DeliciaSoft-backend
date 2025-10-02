const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { restarInventario } = require('./inventariosede.controller');

exports.getAll = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        detalleventa: { select: { iddetalleventa: true } },
        clienteData: { select: { idcliente: true } },
        sede: { select: { idsede: true } },
        estadoVenta: { select: { idestadoventa: true } }
      }
    });

    const ventasTransformadas = ventas.map(v => ({
      idventa: v.idventa,
      fechaventa: v.fechaventa,
      total: v.total,
      metodopago: v.metodopago,
      tipoventa: v.tipoventa,
      detalleventa: v.detalleventa.map(d => d.iddetalleventa),
      cliente: v.clienteData ? v.clienteData.idcliente : null,
      sede: v.sede ? v.sede.idsede : null,
      estadoVenta: v.estadoVenta ? v.estadoVenta.idestadoventa : null
    }));

    res.json(ventasTransformadas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
  }
};

exports.getListadoResumen = async (req, res) => {
    try {
        console.log('Obteniendo listado resumen de ventas...');
        
        const ventas = await prisma.venta.findMany({
            select: {
                idventa: true,
                fechaventa: true,
                total: true,
                metodopago: true,
                tipoventa: true,
                estadoVentaId: true,
                clienteData: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                },
                sede: {
                    select: {
                        nombre: true
                    }
                },
                estadoVenta: {
                    select: {
                        nombre_estado: true
                    }
                }
            },
            orderBy: {
                idventa: 'desc'
            }
        });

        const ventasTransformadas = ventas.map(venta => ({
            idventa: venta.idventa,
            fechaventa: venta.fechaventa,
            total: parseFloat(venta.total || 0),
            metodopago: venta.metodopago || '',
            tipoventa: venta.tipoventa || '',
            idestadoventa: venta.estadoVentaId,
            nombreEstado: venta.estadoVenta?.nombre_estado || 'Sin Estado',
            nombreCliente: venta.clienteData ? `${venta.clienteData.nombre} ${venta.clienteData.apellido}`.trim() : 'Cliente Genérico',
            nombreSede: venta.sede?.nombre || 'Sin Sede'
        }));

        console.log(`Encontradas ${ventasTransformadas.length} ventas`);
        res.json(ventasTransformadas);

    } catch (error) {
        console.error('Error en getListadoResumen:', error);
        res.status(500).json({ 
            message: 'Error al obtener el listado de ventas.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.getDetailsWithAbonos = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ message: 'ID de venta inválido' });
        }

        console.log(`Obteniendo detalle completo con abonos de venta ID: ${id}`);

        const venta = await prisma.venta.findUnique({
            where: { idventa: id },
            include: {
                clienteData: {
                    select: {
                        nombre: true,
                        apellido: true,
                        celular: true
                    }
                },
                sede: {
                    select: {
                        nombre: true,
                        direccion: true
                    }
                },
                estadoVenta: {
                    select: {
                        idestadoventa: true,
                        nombre_estado: true
                    }
                },
                detalleventa: {
                    include: {
                        productogeneral: {
                            select: {
                                nombreproducto: true,
                                precioproducto: true
                            }
                        }
                    }
                },
                pedido: {
                    include: {
                        abonos: {
                            include: {
                                imagenes: {
                                    select: {
                                        urlimg: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada.' });
        }

        let abonos = [];
        if (venta.pedido && venta.pedido.length > 0) {
            abonos = venta.pedido.flatMap(p => p.abonos || []);
        }

        const ventaTransformada = {
            idventa: venta.idventa,
            fechaventa: venta.fechaventa,
            total: parseFloat(venta.total || 0),
            metodopago: venta.metodopago,
            tipoventa: venta.tipoventa,
            estadoVentaId: venta.estadoVentaId,
            clienteData: venta.clienteData,
            sede: venta.sede,
            estadoVenta: venta.estadoVenta,
            detalleventa: venta.detalleventa || [],
            abonos: abonos.map(abono => ({
                idabono: abono.idabono,
                idpedido: abono.idpedido,
                metodopago: abono.metodopago,
                cantidadpagar: parseFloat(abono.cantidadpagar || 0),
                TotalPagado: parseFloat(abono.TotalPagado || 0),
                comprobante_imagen: abono.imagenes?.urlimg || null,
                fecha: new Date().toISOString().split('T')[0],
                anulado: false
            }))
        };

        console.log(`Detalle completo de venta ${id} encontrado con ${abonos.length} abonos`);
        res.json(ventaTransformada);

    } catch (error) {
        console.error('Error en getDetailsWithAbonos:', error);
        res.status(500).json({ 
            message: 'Error al obtener el detalle completo de la venta.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.getDetailsById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ message: 'ID de venta inválido' });
        }

        console.log(`Obteniendo detalle de venta ID: ${id}`);

        const venta = await prisma.venta.findUnique({
            where: { idventa: id },
            include: {
                clienteData: {
                    select: {
                        nombre: true,
                        apellido: true,
                        celular: true
                    }
                },
                sede: {
                    select: {
                        nombre: true,
                        direccion: true
                    }
                },
                estadoVenta: {
                    select: {
                        idestadoventa: true,
                        nombre_estado: true
                    }
                },
                detalleventa: {
                    include: {
                        productogeneral: {
                            select: {
                                nombreproducto: true,
                                precioproducto: true
                            }
                        }
                    }
                }
            }
        });

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada.' });
        }

        const ventaTransformada = {
            idventa: venta.idventa,
            fechaventa: venta.fechaventa,
            total: parseFloat(venta.total || 0),
            metodopago: venta.metodopago,
            tipoventa: venta.tipoventa,
            estadoVentaId: venta.estadoVentaId,
            clienteData: venta.clienteData,
            sede: venta.sede,
            estadoVenta: venta.estadoVenta,
            detalleventa: venta.detalleventa || []
        };

        console.log(`Detalle de venta ${id} encontrado`);
        res.json(ventaTransformada);

    } catch (error) {
        console.error('Error en getDetailsById:', error);
        res.status(500).json({ 
            message: 'Error al obtener el detalle de la venta.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// CREAR VENTA CON DESCUENTO DE INVENTARIO
exports.create = async (req, res) => {
  try {
    console.log('🛒 Creando nueva venta:', req.body);
    
    const {
      fechaventa,
      cliente,
      idsede,
      metodopago,
      tipoventa,
      estadoVentaId = 1,
      total,
      detalleventa
    } = req.body;

    // Validaciones básicas
    if (!idsede) {
      return res.status(400).json({ message: 'La sede es requerida' });
    }

    if (!detalleventa || detalleventa.length === 0) {
      return res.status(400).json({ message: 'Debe incluir al menos un producto' });
    }

    if (!tipoventa) {
      return res.status(400).json({ message: 'El tipo de venta es requerido' });
    }

    // Normalizar tipo de venta
    const tipoVentaNormalizado = tipoventa.toLowerCase();
    const esVentaDirecta = tipoVentaNormalizado === 'directa' || tipoVentaNormalizado === 'venta directa';

    console.log(`📦 Tipo de venta: ${tipoVentaNormalizado}, Es venta directa: ${esVentaDirecta}`);

    const nuevaVenta = await prisma.$transaction(async (tx) => {
      // SOLO VERIFICAR Y DESCONTAR INVENTARIO SI ES VENTA DIRECTA
      if (esVentaDirecta) {
        console.log('🔍 Venta directa detectada - Verificando inventario disponible...');
        
        for (const detalle of detalleventa) {
          const inventario = await tx.inventariosede.findUnique({
            where: {
              idproductogeneral_idsede: {
                idproductogeneral: detalle.idproductogeneral,
                idsede: idsede
              }
            }
          });

          if (!inventario) {
            throw new Error(
              `No hay inventario del producto ID ${detalle.idproductogeneral} en esta sede`
            );
          }

          const cantidadDisponible = parseFloat(inventario.cantidad);
          const cantidadSolicitada = parseFloat(detalle.cantidad || 1);

          if (cantidadDisponible < cantidadSolicitada) {
            throw new Error(
              `Inventario insuficiente para producto ID ${detalle.idproductogeneral}. ` +
              `Disponible: ${cantidadDisponible}, Solicitado: ${cantidadSolicitada}`
            );
          }
        }

        console.log('✅ Inventario verificado para venta directa');
      } else {
        console.log('📋 Pedido detectado - No se verificará inventario (se producirá después)');
      }

      // Crear la venta
      const venta = await tx.venta.create({
        data: {
          fechaventa: new Date(fechaventa),
          cliente,
          idsede,
          metodopago,
          tipoventa: tipoVentaNormalizado,
          estadoVentaId,
          total
        }
      });

      console.log(`✅ Venta creada con ID: ${venta.idventa}`);

      // Crear detalles de venta
      for (const detalle of detalleventa) {
        await tx.detalleventa.create({
          data: {
            idventa: venta.idventa,
            idproductogeneral: detalle.idproductogeneral,
            cantidad: detalle.cantidad || 1,
            preciounitario: detalle.preciounitario,
            subtotal: detalle.subtotal,
            iva: detalle.iva || 0
          }
        });

        // SOLO DESCONTAR INVENTARIO SI ES VENTA DIRECTA
        if (esVentaDirecta) {
          await tx.inventariosede.update({
            where: {
              idproductogeneral_idsede: {
                idproductogeneral: detalle.idproductogeneral,
                idsede: idsede
              }
            },
            data: {
              cantidad: {
                decrement: parseFloat(detalle.cantidad || 1)
              }
            }
          });

          console.log(
            `✅ Inventario descontado: Producto ${detalle.idproductogeneral}, ` +
            `Sede ${idsede}, -${detalle.cantidad}`
          );
        }
      }

      // Retornar venta completa
      return await tx.venta.findUnique({
        where: { idventa: venta.idventa },
        include: {
          detalleventa: {
            include: {
              productogeneral: {
                select: {
                  nombreproducto: true,
                  precioproducto: true
                }
              }
            }
          },
          clienteData: {
            select: {
              nombre: true,
              apellido: true
            }
          },
          sede: {
            select: {
              nombre: true
            }
          }
        }
      });
    });

    const mensaje = esVentaDirecta 
      ? `Venta directa creada. Inventario actualizado.`
      : `Pedido creado. El producto se producirá después del 50% de abono.`;

    console.log(`✅ ${mensaje}`);
    
    res.status(201).json({
      ...nuevaVenta,
      mensaje
    });

  } catch (error) {
    console.error('❌ Error al crear venta:', error);
    
    // Si el error es de inventario insuficiente, devolver 400
    if (error.message.includes('inventario') || error.message.includes('Inventario')) {
      return res.status(400).json({ 
        message: error.message,
        tipo: 'INVENTARIO_INSUFICIENTE'
      });
    }

    res.status(500).json({ 
      message: 'Error al crear venta', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de venta inválido' });
    }

    console.log(`Obteniendo venta por ID: ${id}`);

    const venta = await prisma.venta.findUnique({ 
      where: { idventa: id },
      include: {
        estadoVenta: {
          select: {
            idestadoventa: true,
            nombre_estado: true
          }
        },
        clienteData: {
          select: {
            nombre: true,
            apellido: true
          }
        },
        sede: {
          select: {
            nombre: true
          }
        }
      }
    });
    
    if (!venta) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    console.log(`Venta ${id} encontrada`);
    res.json(venta);

  } catch (error) {
    console.error('Error en getById:', error);
    res.status(500).json({ 
      message: 'Error al obtener venta', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de venta inválido' });
    }

    console.log(`Actualizando venta ${id}:`, req.body);

    const ventaExiste = await prisma.venta.findUnique({
      where: { idventa: id }
    });

    if (!ventaExiste) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    const updated = await prisma.venta.update({
      where: { idventa: id },
      data: req.body,
      include: {
        estadoVenta: true
      }
    });

    console.log(`Venta ${id} actualizada`);
    res.json(updated);

  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ 
      message: 'Error al actualizar venta', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de venta inválido' });
    }

    console.log(`Eliminando venta ${id}`);

    const ventaExiste = await prisma.venta.findUnique({
      where: { idventa: id }
    });

    if (!ventaExiste) {
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    await prisma.venta.delete({ 
      where: { idventa: id } 
    });

    console.log(`Venta ${id} eliminada`);
    res.json({ message: 'Venta eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar venta:', error);
    res.status(500).json({ 
      message: 'Error al eliminar venta', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};