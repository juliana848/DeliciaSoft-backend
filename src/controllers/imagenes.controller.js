require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validar configuración de Cloudinary
const validateCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || api_secret) {
    throw new Error('Configuración de Cloudinary incompleta. Verifica las variables de entorno.');
  }
};

// Obtener todas las imágenes
exports.getAll = async (req, res) => {
  try {
    console.log('📋 Obteniendo todas las imágenes...');
    
    const imagenes = await prisma.imagenes.findMany({
      orderBy: {
        idimagen: 'desc' // Más recientes primero
      }
    });

    console.log(`✅ Se encontraron ${imagenes.length} imágenes`);
    res.json(imagenes);
  } catch (error) {
    console.error('❌ Error al obtener imágenes:', error);
    res.status(500).json({ 
      message: 'Error al obtener imágenes', 
      error: error.message 
    });
  }
};

// Obtener imagen por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        message: "El ID debe ser un número válido" 
      });
    }

    console.log(`🔍 Buscando imagen con ID: ${id}`);

    const imagen = await prisma.imagenes.findUnique({
      where: { idimagen: id }
    });

    if (!imagen) {
      return res.status(404).json({ 
        message: `No se encontró la imagen con ID: ${id}` 
      });
    }

    console.log(`✅ Imagen encontrada: ${imagen.urlimg}`);
    res.json(imagen);
  } catch (error) {
    console.error('❌ Error al obtener imagen:', error);
    res.status(500).json({ 
      message: 'Error al obtener imagen', 
      error: error.message 
    });
  }
};

// Subir imagen a Cloudinary y guardar URL en BD - VERSIÓN SIMPLIFICADA
exports.uploadImage = async (req, res) => {
  try {
    console.log('📤 Iniciando subida de imagen...');
    console.log('📝 Datos de request:', {
      hasFile: !!req.file,
      body: req.body,
      headers: Object.keys(req.headers)
    });
    
    // Validar que se recibió un archivo
    if (!req.file) {
      console.error('❌ No se recibió archivo');
      return res.status(400).json({ 
        message: 'No se recibió ningún archivo. Asegúrate de usar el campo "image" en el formulario.' 
      });
    }

    console.log('📁 Archivo recibido:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    });

    // Validar configuración de Cloudinary
    try {
      validateCloudinaryConfig();
      console.log('✅ Configuración de Cloudinary válida');
    } catch (error) {
      console.error('❌ Error de configuración Cloudinary:', error);
      return res.status(500).json({
        message: 'Error de configuración del servicio de imágenes',
        error: error.message
      });
    }

    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!tiposPermitidos.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: 'Tipo de archivo no permitido. Solo se aceptan: JPG, JPEG, PNG, GIF',
        tipoRecibido: req.file.mimetype
      });
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB en bytes
    if (req.file.size > maxSize) {
      return res.status(400).json({
        message: 'El archivo es demasiado grande. Tamaño máximo: 10MB',
        tamañoRecibido: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
      });
    }

    console.log(`🔍 Archivo validado: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB)`);

    // Función para subir a Cloudinary usando stream - SIMPLIFICADA
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const options = {
          folder: 'deliciasoft/productos',
          transformation: [
            { 
              width: 800, 
              height: 600, 
              crop: 'limit',
              quality: 'auto:good',
              fetch_format: 'auto'
            }
          ],
          resource_type: 'image'
        };

        const stream = cloudinary.uploader.upload_stream(
          options,
          (error, result) => {
            if (result) {
              console.log('✅ Imagen subida a Cloudinary:', result.public_id);
              resolve(result);
            } else {
              console.error('❌ Error en Cloudinary:', error);
              reject(error);
            }
          }
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    // Subir imagen a Cloudinary
    console.log('☁️ Subiendo a Cloudinary...');
    const cloudinaryResult = await streamUpload(req.file.buffer);

    // Guardar información en la base de datos - SOLO CAMPOS BÁSICOS
    console.log('💾 Guardando información en base de datos...');
    
    // Crear objeto con solo los campos que existen en tu tabla
    const datosImagen = {
      urlimg: cloudinaryResult.secure_url
    };

    // Solo agregar campos adicionales si existen en tu modelo
    // Descomenta las líneas que correspondan a tu estructura de BD:
    // datosImagen.public_id = cloudinaryResult.public_id;
    // datosImagen.formato = cloudinaryResult.format;
    // datosImagen.tamano = cloudinaryResult.bytes;
    // datosImagen.ancho = cloudinaryResult.width;
    // datosImagen.alto = cloudinaryResult.height;

    const nuevaImagen = await prisma.imagenes.create({
      data: datosImagen
    });

    console.log(`✅ Imagen guardada exitosamente con ID: ${nuevaImagen.idimagen}`);

    res.status(201).json({
      message: 'Imagen subida exitosamente',
      imagen: nuevaImagen,
      cloudinary: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        formato: cloudinaryResult.format,
        dimensiones: `${cloudinaryResult.width}x${cloudinaryResult.height}`,
        tamano: `${(cloudinaryResult.bytes / 1024).toFixed(2)}KB`
      }
    });

  } catch (error) {
    console.error('❌ Error completo al subir imagen:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Errores específicos de Cloudinary
    if (error.error && error.error.message) {
      return res.status(400).json({
        message: 'Error del servicio de imágenes',
        error: error.error.message,
        details: error.error
      });
    }

    // Error de validación de multer
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Archivo demasiado grande',
        error: 'El archivo excede el límite de tamaño permitido'
      });
    }

    res.status(500).json({ 
      message: 'Error interno al subir imagen', 
      error: error.message,
      type: error.constructor.name
    });
  }
};

// Guardar imagen ya subida (solo URL)
exports.saveUrl = async (req, res) => {
  try {
    console.log('💾 Guardando URL de imagen...');
    
    const { urlimg, descripcion } = req.body;
    
    if (!urlimg) {
      return res.status(400).json({ 
        message: "La URL de la imagen es requerida" 
      });
    }

    // Validar que sea una URL válida
    try {
      new URL(urlimg);
    } catch (error) {
      return res.status(400).json({ 
        message: "URL inválida" 
      });
    }

    const nuevaImagen = await prisma.imagenes.create({
      data: { 
        urlimg,
        // Solo agregar descripción si ese campo existe en tu tabla
        // descripcion: descripcion || null
      }
    });

    console.log(`✅ URL guardada exitosamente con ID: ${nuevaImagen.idimagen}`);

    res.status(201).json({
      message: 'URL de imagen guardada exitosamente',
      imagen: nuevaImagen
    });

  } catch (error) {
    console.error('❌ Error al guardar URL:', error);
    res.status(500).json({ 
      message: "Error al guardar URL", 
      error: error.message 
    });
  }
};

// Actualizar URL de imagen
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { urlimg, descripcion } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ 
        message: "El ID debe ser un número válido" 
      });
    }

    console.log(`🔄 Actualizando imagen ID: ${id}`);

    const imagenExiste = await prisma.imagenes.findUnique({ 
      where: { idimagen: id } 
    });

    if (!imagenExiste) {
      return res.status(404).json({ 
        message: `No se encontró la imagen con ID: ${id}` 
      });
    }

    // Validar URL si se proporciona
    if (urlimg) {
      try {
        new URL(urlimg);
      } catch (error) {
        return res.status(400).json({ 
          message: "URL inválida" 
        });
      }
    }

    const datosActualizacion = {};
    if (urlimg) datosActualizacion.urlimg = urlimg;
    // if (descripcion !== undefined) datosActualizacion.descripcion = descripcion;

    const imagenActualizada = await prisma.imagenes.update({
      where: { idimagen: id },
      data: datosActualizacion
    });

    console.log(`✅ Imagen actualizada: ${imagenActualizada.idimagen}`);

    res.json({
      message: 'Imagen actualizada exitosamente',
      imagen: imagenActualizada
    });

  } catch (error) {
    console.error('❌ Error al actualizar imagen:', error);
    res.status(500).json({ 
      message: 'Error al actualizar imagen', 
      error: error.message 
    });
  }
};

// Eliminar imagen
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ 
        message: "El ID debe ser un número válido" 
      });
    }

    console.log(`🗑️ Eliminando imagen ID: ${id}`);

    const imagenExiste = await prisma.imagenes.findUnique({ 
      where: { idimagen: id },
      select: {
        idimagen: true,
        urlimg: true
        // public_id: true  // Descomenta si tienes este campo
      }
    });

    if (!imagenExiste) {
      return res.status(404).json({ 
        message: `No se encontró la imagen con ID: ${id}` 
      });
    }

    // Si tienes public_id en tu BD, puedes eliminar de Cloudinary también:
    /*
    if (imagenExiste.public_id) {
      try {
        console.log(`☁️ Eliminando de Cloudinary: ${imagenExiste.public_id}`);
        await cloudinary.uploader.destroy(imagenExiste.public_id);
        console.log('✅ Imagen eliminada de Cloudinary');
      } catch (cloudinaryError) {
        console.warn('⚠️ No se pudo eliminar de Cloudinary:', cloudinaryError.message);
      }
    }
    */

    // Eliminar de la base de datos
    await prisma.imagenes.delete({ 
      where: { idimagen: id } 
    });

    console.log(`✅ Imagen eliminada de la base de datos: ${id}`);

    res.json({ 
      message: 'Imagen eliminada correctamente',
      imagenEliminada: {
        id: imagenExiste.idimagen,
        url: imagenExiste.urlimg
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar imagen:', error);
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        message: 'No se puede eliminar la imagen porque está siendo usada por productos u otros elementos',
        error: 'Restricción de integridad referencial'
      });
    }

    res.status(500).json({ 
      message: 'Error al eliminar imagen', 
      error: error.message 
    });
  }
};

// Obtener estadísticas de imágenes
exports.getEstadisticas = async (req, res) => {
  try {
    console.log('📊 Generando estadísticas de imágenes...');

    const [totalImagenes, imagenesUsadas, imagenesNoUsadas] = await Promise.all([
      prisma.imagenes.count(),
      prisma.imagenes.count({
        where: {
          OR: [
            { productogeneral: { some: {} } }
          ]
        }
      }),
      prisma.imagenes.count({
        where: {
          AND: [
            { productogeneral: { none: {} } }
          ]
        }
      })
    ]);

    const estadisticas = {
      totalImagenes,
      imagenesUsadas,
      imagenesNoUsadas,
      porcentajeUso: totalImagenes > 0 ? ((imagenesUsadas / totalImagenes) * 100).toFixed(2) : 0
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

// Validar configuración de Cloudinary
exports.validateCloudinaryConfig = async (req, res) => {
  try {
    console.log('🔍 Validando configuración de Cloudinary...');
    
    validateCloudinaryConfig();
    
    // Hacer una prueba simple con Cloudinary
    const testResult = await cloudinary.api.ping();
    
    res.json({
      message: 'Configuración de Cloudinary válida',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      status: testResult.status || 'ok'
    });

  } catch (error) {
    console.error('❌ Error de configuración Cloudinary:', error);
    res.status(500).json({
      message: 'Error en la configuración de Cloudinary',
      error: error.message,
      variables: {
        cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET
      }
    });
  }
};