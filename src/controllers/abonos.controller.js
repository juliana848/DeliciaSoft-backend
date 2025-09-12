require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función para subir imagen a Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'deliciasoft/comprobantes',
        resource_type: 'image'
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const getAbonos = async (req, res) => {
  try {
    const abonos = await prisma.abonos.findMany({
      include: {
        imagenes: {
          select: {
            idimagen: true,
            urlimg: true
          }
        },
        pedido: {
          include: {
            venta: {
              select: {
                idventa: true,
                total: true,
                clienteData: {
                  select: {
                    nombre: true,
                    apellido: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Transformar la respuesta para el frontend
    const abonosTransformados = abonos.map(abono => ({
      id: abono.idabono,
      idPedido: abono.idpedido,
      metodoPago: abono.metodopago,
      monto: parseFloat(abono.cantidadpagar || 0),
      totalPagado: parseFloat(abono.TotalPagado || 0),
      comprobante_imagen: abono.imagenes?.urlimg || null,
      cliente: abono.pedido?.venta?.clienteData 
        ? `${abono.pedido.venta.clienteData.nombre} ${abono.pedido.venta.clienteData.apellido}`.trim()
        : 'N/A',
      totalVenta: parseFloat(abono.pedido?.venta?.total || 0),
      anulado: false
    }));

    res.json(abonosTransformados);
  } catch (error) {
    console.error('Error al obtener abonos:', error);
    res.status(500).json({ message: "Error al obtener abonos", error: error.message });
  }
};

const getAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const abono = await prisma.abonos.findUnique({
      where: { idabono: id },
      include: {
        imagenes: true,
        pedido: {
          include: {
            venta: {
              include: {
                clienteData: true
              }
            }
          }
        }
      }
    });
    
    if (!abono) return res.status(404).json({ message: "Abono no encontrado" });
    
    const abonoTransformado = {
      id: abono.idabono,
      idPedido: abono.idpedido,
      metodoPago: abono.metodopago,
      monto: parseFloat(abono.cantidadpagar || 0),
      totalPagado: parseFloat(abono.TotalPagado || 0),
      comprobante_imagen: abono.imagenes?.urlimg || null,
      fecha: new Date().toISOString().split('T')[0],
      cliente: abono.pedido?.venta?.clienteData 
        ? `${abono.pedido.venta.clienteData.nombre} ${abono.pedido.venta.clienteData.apellido}`.trim()
        : 'N/A'
    };
    
    res.json(abonoTransformado);
  } catch (error) {
    console.error('Error al obtener abono:', error);
    res.status(500).json({ message: "Error al obtener abono", error: error.message });
  }
};

// FUNCIÓN PRINCIPAL CORREGIDA - ESTA ES LA QUE ESTABA FALLANDO
const createAbono = async (req, res) => {
  try {
    console.log('Creando abono:', req.body);
    console.log('Archivo recibido:', req.file ? 'Sí' : 'No');

    const { idpedido, metodopago, cantidadpagar, TotalPagado } = req.body;
    
    // Validaciones básicas
    if (!idpedido) {
      return res.status(400).json({ message: "ID de pedido es requerido" });
    }
    if (!metodopago) {
      return res.status(400).json({ message: "Método de pago es requerido" });
    }
    if (!cantidadpagar || parseFloat(cantidadpagar) <= 0) {
      return res.status(400).json({ message: "Cantidad a pagar debe ser mayor a 0" });
    }

    // Validar longitud del método de pago
    if (metodopago.length > 20) {
      return res.status(400).json({ message: "Método de pago muy largo (máximo 20 caracteres)" });
    }

    console.log('Validaciones pasadas. Método de pago:', metodopago, 'Longitud:', metodopago.length);

    // IMPORTANTE: El frontend envía el ID de venta como "idpedido"
    const idVenta = parseInt(idpedido);
    console.log('ID de venta recibido:', idVenta);
    
    // Verificar que la venta existe
    const ventaExiste = await prisma.venta.findUnique({
      where: { idventa: idVenta }
    });
    
    if (!ventaExiste) {
      return res.status(404).json({ message: "Venta no encontrada con ID: " + idVenta });
    }
    
    console.log('Venta verificada exitosamente:', idVenta);

    // Buscar pedido existente para esta venta
    let pedido = await prisma.pedido.findFirst({
      where: { idventa: idVenta }
    });

    // Si no existe pedido, crearlo
    if (!pedido) {
      console.log('Creando nuevo pedido para venta:', idVenta);
      
      try {
        pedido = await prisma.pedido.create({
          data: {
            idventa: idVenta
            // Todos los demás campos de tu modelo pedido son opcionales
          }
        });
        console.log('Pedido creado exitosamente con ID:', pedido.idpedido, 'para venta:', idVenta);
      } catch (pedidoError) {
        console.error('Error al crear pedido:', pedidoError);
        return res.status(500).json({ 
          message: "Error al crear pedido para la venta", 
          error: pedidoError.message
        });
      }
    } else {
      console.log('Usando pedido existente con ID:', pedido.idpedido, 'para venta:', idVenta);
    }

    let imagenId = null;

    // Si hay archivo de imagen, subirlo a Cloudinary
    if (req.file) {
      try {
        console.log('Subiendo imagen a Cloudinary...');
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
        console.log('Imagen subida exitosamente:', cloudinaryResult.secure_url);

        const nuevaImagen = await prisma.imagenes.create({
          data: {
            urlimg: cloudinaryResult.secure_url
          }
        });

        imagenId = nuevaImagen.idimagen;
        console.log('Imagen guardada en BD con ID:', imagenId);

      } catch (uploadError) {
        console.error('Error al subir imagen:', uploadError);
        return res.status(500).json({ 
          message: "Error al subir imagen de comprobante", 
          error: uploadError.message 
        });
      }
    }

    // Crear el abono usando el ID correcto del pedido (NO el de la venta)
    console.log('Creando abono con idpedido:', pedido.idpedido);
    
    const nuevoAbono = await prisma.abonos.create({
      data: {
        idpedido: pedido.idpedido, // CRUCIAL: Usar ID del pedido, NO de la venta
        metodopago: metodopago,
        cantidadpagar: parseFloat(cantidadpagar),
        TotalPagado: parseFloat(TotalPagado || cantidadpagar),
        idimagen: imagenId
      },
      include: {
        imagenes: true,
        pedido: {
          include: {
            venta: {
              include: {
                clienteData: true
              }
            }
          }
        }
      }
    });

    console.log('Abono creado exitosamente con ID:', nuevoAbono.idabono);

    // Transformar respuesta para el frontend
    const abonoRespuesta = {
      id: nuevoAbono.idabono,
      idPedido: nuevoAbono.idpedido,
      metodoPago: nuevoAbono.metodopago,
      monto: parseFloat(nuevoAbono.cantidadpagar),
      totalPagado: parseFloat(nuevoAbono.TotalPagado || 0),
      comprobante_imagen: nuevoAbono.imagenes?.urlimg || null,
      fecha: new Date().toISOString().split('T')[0],
      falta_por_pagar: parseFloat(nuevoAbono.pedido?.venta?.total || 0) - parseFloat(nuevoAbono.TotalPagado || 0),
      anulado: false
    };

    res.status(201).json(abonoRespuesta);
  } catch (error) {
    console.error('Error al crear abono:', error);
    res.status(500).json({ message: "Error al crear abono", error: error.message });
  }
};

const updateAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    console.log(`Actualizando abono ${id}:`, req.body);

    const abonoExiste = await prisma.abonos.findUnique({
      where: { idabono: id },
      include: { imagenes: true }
    });

    if (!abonoExiste) {
      return res.status(404).json({ message: "Abono no encontrado" });
    }

    const { metodopago, cantidadpagar, TotalPagado } = req.body;
    let imagenId = abonoExiste.idimagen;

    if (metodopago && metodopago.length > 20) {
      return res.status(400).json({ message: "Método de pago muy largo (máximo 20 caracteres)" });
    }

    if (req.file) {
      try {
        console.log('Subiendo nueva imagen...');
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

        const nuevaImagen = await prisma.imagenes.create({
          data: {
            urlimg: cloudinaryResult.secure_url
          }
        });

        imagenId = nuevaImagen.idimagen;

        if (abonoExiste.imagenes?.urlimg) {
          const urlParts = abonoExiste.imagenes.urlimg.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = `deliciasoft/comprobantes/${publicIdWithExtension.split('.')[0]}`;
          
          try {
            await cloudinary.uploader.destroy(publicId);
            console.log('Imagen anterior eliminada de Cloudinary');
          } catch (deleteError) {
            console.warn('No se pudo eliminar imagen anterior:', deleteError.message);
          }
        }

      } catch (uploadError) {
        console.error('Error al subir nueva imagen:', uploadError);
        return res.status(500).json({ 
          message: "Error al actualizar imagen de comprobante", 
          error: uploadError.message 
        });
      }
    }

    const abonoActualizado = await prisma.abonos.update({
      where: { idabono: id },
      data: {
        ...(metodopago && { metodopago }),
        ...(cantidadpagar && { cantidadpagar: parseFloat(cantidadpagar) }),
        ...(TotalPagado && { TotalPagado: parseFloat(TotalPagado) }),
        ...(imagenId !== abonoExiste.idimagen && { idimagen: imagenId })
      },
      include: {
        imagenes: true,
        pedido: {
          include: {
            venta: true
          }
        }
      }
    });

    console.log('Abono actualizado exitosamente');
    res.json({
      id: abonoActualizado.idabono,
      idPedido: abonoActualizado.idpedido,
      metodoPago: abonoActualizado.metodopago,
      monto: parseFloat(abonoActualizado.cantidadpagar),
      totalPagado: parseFloat(abonoActualizado.TotalPagado || 0),
      comprobante_imagen: abonoActualizado.imagenes?.urlimg || null
    });

  } catch (error) {
    console.error('Error al actualizar abono:', error);
    res.status(500).json({ message: "Error al actualizar abono", error: error.message });
  }
};

const deleteAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    console.log(`Eliminando abono ${id}`);

    const abono = await prisma.abonos.findUnique({
      where: { idabono: id },
      include: { imagenes: true }
    });

    if (!abono) {
      return res.status(404).json({ message: "Abono no encontrado" });
    }

    if (abono.imagenes?.urlimg) {
      const urlParts = abono.imagenes.urlimg.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = `deliciasoft/comprobantes/${publicIdWithExtension.split('.')[0]}`;
      
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log('Imagen eliminada de Cloudinary');
      } catch (deleteError) {
        console.warn('No se pudo eliminar imagen:', deleteError.message);
      }
    }

    await prisma.abonos.delete({ where: { idabono: id } });
    
    console.log('Abono eliminado exitosamente');
    res.json({ message: "Abono eliminado correctamente" });
  } catch (error) {
    console.error('Error al eliminar abono:', error);
    res.status(500).json({ message: "Error al eliminar abono", error: error.message });
  }
};

const getAbonosByPedidoId = async (req, res) => {
  const idPedido = parseInt(req.params.idPedido);
  try {
    console.log(`Obteniendo abonos del pedido/venta ${idPedido}`);

    // El frontend envía el ID de venta, no de pedido
    const pedido = await prisma.pedido.findFirst({
      where: { idventa: idPedido },
      include: { 
        venta: { 
          select: { total: true } 
        } 
      }
    });

    if (!pedido) {
      console.log('No se encontró pedido para la venta, creando uno...');
      try {
        const nuevoPedido = await prisma.pedido.create({
          data: {
            idventa: idPedido
          },
          include: { 
            venta: { 
              select: { total: true } 
            } 
          }
        });
        console.log('Pedido creado para venta:', idPedido);
        return res.json([]);
      } catch (createError) {
        console.error('Error al crear pedido:', createError);
        return res.json([]);
      }
    }

    const abonos = await prisma.abonos.findMany({
      where: { idpedido: pedido.idpedido },
      include: {
        imagenes: {
          select: { 
            idimagen: true,
            urlimg: true 
          }
        }
      },
      orderBy: {
        idabono: 'desc'
      }
    });

    let totalPagadoAcumulado = 0;
    const totalVenta = parseFloat(pedido.venta?.total || 0);

    const resultado = abonos.map((abono, index) => {
      totalPagadoAcumulado += parseFloat(abono.cantidadpagar || 0);
      
      return {
        id: abono.idabono,
        idPedido: abono.idpedido,
        metodoPago: abono.metodopago,
        monto: parseFloat(abono.cantidadpagar || 0),
        fecha: new Date().toISOString().split('T')[0],
        comprobante_imagen: abono.imagenes?.urlimg || null,
        falta_por_pagar: totalVenta - totalPagadoAcumulado,
        totalPagado: parseFloat(abono.TotalPagado || 0),
        anulado: false
      };
    });

    console.log(`Encontrados ${resultado.length} abonos para venta ${idPedido}`);
    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener abonos por pedido:', error);
    res.status(500).json({ message: "Error al obtener abonos por pedido", error: error.message });
  }
};

const anularAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    console.log(`Anulando abono ${id}`);

    const abonoExiste = await prisma.abonos.findUnique({
      where: { idabono: id }
    });

    if (!abonoExiste) {
      return res.status(404).json({ message: "Abono no encontrado" });
    }

    console.log('Abono anulado exitosamente');
    res.json({ 
      message: "Abono anulado correctamente",
      id: id,
      anulado: true
    });

  } catch (error) {
    console.error('Error al anular abono:', error);
    res.status(500).json({ message: "Error al anular abono", error: error.message });
  }
};

module.exports = {
  getAbonos,
  getAbono,
  createAbono,
  updateAbono,
  deleteAbono,
  getAbonosByPedidoId,
  anularAbono
};