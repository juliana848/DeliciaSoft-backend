const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// FUNCIÓN PRINCIPAL PARA LISTADO - NO REQUIERE ID
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

// NUEVA FUNCIÓN PARA OBTENER DETALLE COMPLETO CON ABONOS (/detalles endpoint)
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
                        celular: true // Cambiado de telefono a celular
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
                                nombreproducto: true, // Cambiado de nombre a nombreproducto
                                precioproducto: true  // Cambiado de precio a precioproducto
                            }
                        }
                    }
                },
                // Incluir abonos a través de la relación pedido
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

        // Extraer abonos de la relación pedido
        let abonos = [];
        if (venta.pedido && venta.pedido.length > 0) {
            abonos = venta.pedido.flatMap(p => p.abonos || []);
        }

        // Transformar la respuesta
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
                fecha: new Date().toISOString().split('T')[0], // Temporal
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

// FUNCIÓN CORREGIDA PARA OBTENER DETALLE POR ID
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
                        celular: true // Cambiado de telefono a celular
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
                                nombreproducto: true, // Cambiado de nombre a nombreproducto
                                precioproducto: true  // Cambiado de precio a precioproducto
                            }
                        }
                    }
                }
            }
        });

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada.' });
        }

        // Transformar la respuesta
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

exports.create = async (req, res) => {
  try {
    console.log('Creando nueva venta:', req.body);
    
    const {
      fechaventa,
      cliente,
      idsede,
      metodopago,
      tipoventa,
      estadoVentaId = 1, // Default a estado activo
      total,
      detalleventa
    } = req.body;

    const nuevaVenta = await prisma.venta.create({
      data: {
        fechaventa: new Date(fechaventa),
        cliente,
        idsede,
        metodopago,
        tipoventa,
        estadoVentaId,
        total,
        detalleventa: {
          createMany: {
            data: detalleventa
          }
        }
      },
      include: {
        detalleventa: true
      }
    });

    console.log('Venta creada con ID:', nuevaVenta.idventa);
    res.status(201).json(nuevaVenta);

  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ 
      message: 'Error al crear venta', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// getById PARA USO INDIVIDUAL - REQUIERE ID
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