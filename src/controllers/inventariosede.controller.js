// controllers/inventariosede.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener inventario por sede y producto
exports.getInventarioBySede = async (req, res) => {
  try {
    const { idproductogeneral, idsede } = req.query;
    
    if (!idproductogeneral || !idsede) {
      return res.status(400).json({ 
        message: 'Faltan parámetros: idproductogeneral e idsede son requeridos' 
      });
    }
    
    const inventario = await prisma.inventariosede.findUnique({
      where: {
        idproductogeneral_idsede: {
          idproductogeneral: parseInt(idproductogeneral),
          idsede: parseInt(idsede)
        }
      },
      include: {
        productogeneral: {
          select: {
            nombreproducto: true,
            precioproducto: true,
            imagenes: {
              select: {
                urlimg: true
              }
            }
          }
        },
        sede: {
          select: {
            nombre: true,
            direccion: true
          }
        }
      }
    });
    
    if (!inventario) {
      return res.json({ 
        cantidad: 0,
        idproductogeneral: parseInt(idproductogeneral),
        idsede: parseInt(idsede),
        mensaje: 'No hay inventario registrado'
      });
    }
    
    res.json(inventario);
  } catch (error) {
    console.error('Error al obtener inventario por sede:', error);
    res.status(500).json({ 
      message: 'Error al obtener inventario', 
      error: error.message 
    });
  }
};

// Obtener todo el inventario de un producto en todas las sedes
exports.getInventarioProducto = async (req, res) => {
  try {
    const idproductogeneral = parseInt(req.params.idproductogeneral);
    
    if (isNaN(idproductogeneral)) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }
    
    const inventarios = await prisma.inventariosede.findMany({
      where: { idproductogeneral },
      include: {
        sede: {
          select: {
            idsede: true,
            nombre: true,
            direccion: true
          }
        }
      },
      orderBy: {
        sede: {
          nombre: 'asc'
        }
      }
    });
    
    const total = inventarios.reduce((sum, inv) => sum + parseFloat(inv.cantidad), 0);
    
    const producto = await prisma.productogeneral.findUnique({
      where: { idproductogeneral },
      select: {
        nombreproducto: true,
        precioproducto: true
      }
    });
    
    res.json({
      idproductogeneral,
      producto,
      inventarios,
      totalGeneral: total
    });
  } catch (error) {
    console.error('Error al obtener inventario del producto:', error);
    res.status(500).json({ 
      message: 'Error al obtener inventario', 
      error: error.message 
    });
  }
};

// Obtener todo el inventario agrupado por sede
exports.getInventarioGeneral = async (req, res) => {
  try {
    const inventarios = await prisma.inventariosede.findMany({
      include: {
        productogeneral: {
          select: {
            idproductogeneral: true,
            nombreproducto: true,
            precioproducto: true,
            imagenes: {
              select: {
                urlimg: true
              }
            }
          }
        },
        sede: {
          select: {
            idsede: true,
            nombre: true
          }
        }
      },
      orderBy: [
        {
          sede: {
            nombre: 'asc'
          }
        },
        {
          productogeneral: {
            nombreproducto: 'asc'
          }
        }
      ]
    });
    
    res.json(inventarios);
  } catch (error) {
    console.error('Error al obtener inventario general:', error);
    res.status(500).json({ 
      message: 'Error al obtener inventario general', 
      error: error.message 
    });
  }
};

// Sumar inventario (usado en producción) - FUNCIÓN AUXILIAR
exports.sumarInventario = async (idproductogeneral, idsede, cantidad) => {
  try {
    const inventarioExistente = await prisma.inventariosede.findUnique({
      where: {
        idproductogeneral_idsede: {
          idproductogeneral: parseInt(idproductogeneral),
          idsede: parseInt(idsede)
        }
      }
    });
    
    if (inventarioExistente) {
      // Actualizar existente
      return await prisma.inventariosede.update({
        where: {
          idproductogeneral_idsede: {
            idproductogeneral: parseInt(idproductogeneral),
            idsede: parseInt(idsede)
          }
        },
        data: {
          cantidad: {
            increment: parseFloat(cantidad)
          }
        }
      });
    } else {
      // Crear nuevo registro
      return await prisma.inventariosede.create({
        data: {
          idproductogeneral: parseInt(idproductogeneral),
          idsede: parseInt(idsede),
          cantidad: parseFloat(cantidad)
        }
      });
    }
  } catch (error) {
    console.error('Error al sumar inventario:', error);
    throw error;
  }
};

// Restar inventario (usado en ventas) - FUNCIÓN AUXILIAR
exports.restarInventario = async (idproductogeneral, idsede, cantidad) => {
  try {
    const inventarioExistente = await prisma.inventariosede.findUnique({
      where: {
        idproductogeneral_idsede: {
          idproductogeneral: parseInt(idproductogeneral),
          idsede: parseInt(idsede)
        }
      }
    });
    
    if (!inventarioExistente) {
      throw new Error(`No hay inventario para el producto ${idproductogeneral} en la sede ${idsede}`);
    }
    
    const nuevaCantidad = parseFloat(inventarioExistente.cantidad) - parseFloat(cantidad);
    
    if (nuevaCantidad < 0) {
      throw new Error(`Inventario insuficiente. Disponible: ${inventarioExistente.cantidad}, Requerido: ${cantidad}`);
    }
    
    return await prisma.inventariosede.update({
      where: {
        idproductogeneral_idsede: {
          idproductogeneral: parseInt(idproductogeneral),
          idsede: parseInt(idsede)
        }
      },
      data: {
        cantidad: nuevaCantidad
      }
    });
  } catch (error) {
    console.error('Error al restar inventario:', error);
    throw error;
  }
};

// Actualizar inventario manualmente (para ajustes)
exports.actualizarInventario = async (req, res) => {
  try {
    const { idproductogeneral, idsede, cantidad } = req.body;
    
    if (!idproductogeneral || !idsede || cantidad === undefined) {
      return res.status(400).json({ 
        message: 'Faltan datos requeridos: idproductogeneral, idsede, cantidad' 
      });
    }
    
    const inventario = await prisma.inventariosede.upsert({
      where: {
        idproductogeneral_idsede: {
          idproductogeneral: parseInt(idproductogeneral),
          idsede: parseInt(idsede)
        }
      },
      update: {
        cantidad: parseFloat(cantidad)
      },
      create: {
        idproductogeneral: parseInt(idproductogeneral),
        idsede: parseInt(idsede),
        cantidad: parseFloat(cantidad)
      },
      include: {
        productogeneral: {
          select: {
            nombreproducto: true
          }
        },
        sede: {
          select: {
            nombre: true
          }
        }
      }
    });
    
    res.json({
      message: 'Inventario actualizado correctamente',
      inventario
    });
  } catch (error) {
    console.error('Error al actualizar inventario:', error);
    res.status(500).json({ 
      message: 'Error al actualizar inventario', 
      error: error.message 
    });
  }
};

module.exports = {
  getInventarioBySede: exports.getInventarioBySede,
  getInventarioProducto: exports.getInventarioProducto,
  getInventarioGeneral: exports.getInventarioGeneral,
  sumarInventario: exports.sumarInventario,
  restarInventario: exports.restarInventario,
  actualizarInventario: exports.actualizarInventario
};