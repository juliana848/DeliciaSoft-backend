require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuración inicial de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validar configuración de Cloudinary
const validateCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Configuración de Cloudinary incompleta. Verifica las variables de entorno.');
  }
};

// Obtener todas las imágenes
exports.getAll = async (req, res) => {
  try {
    console.log('Obteniendo todas las imágenes...');
    
    const imagenes = await prisma.imagenes.findMany({
      orderBy: {
        idimagen: 'desc' // Más recientes primero
      }
    });

    console.log(`Se encontraron ${imagenes.length} imágenes`);
    res.json(imagenes);
  } catch (error) {
    console.error('Error al obtener imágenes:', error);
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

    console.log(`Buscando imagen con ID: ${id}`);

    const imagen = await prisma.imagenes.findUnique({
      where: { idimagen: id }
    });

    if (!imagen) {
      return res.status(404).json({ 
        message: `No se encontró la imagen con ID: ${id}` 
      });
    }

    console.log(`Imagen encontrada: ${imagen.urlimg}`);
    res.json(imagen);
  } catch (error) {
    console.error('Error al obtener imagen:', error);
    res.status(500).json({ 
      message: 'Error al obtener imagen', 
      error: error.message 
    });
  }
};

// Subir imagen a Cloudinary y guardar URL en BD - VERSIÓN CORREGIDA
exports.uploadImage = async (req, res) => {
  try {
    console.log('=== INICIANDO SUBIDA DE IMAGEN ===');
    console.log('Datos de request:', {
      hasFile: !!req.file,
      body: req.body,
      fieldName: req.file?.fieldname || 'no file',
      files: req.files ? Object.keys(req.files) : 'no files'
    });
    
    // Validar que se recibió un archivo
    if (!req.file) {
      console.error('No se recibió archivo');
      return res.status(400).json({ 
        message: 'No se recibió ningún archivo. Asegúrate de usar el campo "image" o "imagen" en el formulario.' 
      });
    }

    console.log('Archivo recibido:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    });

    // CORRECCIÓN PRINCIPAL: Re-configurar Cloudinary explícitamente
    try {
      console.log('Re-configurando Cloudinary...');
      console.log('Variables disponibles:', {
        cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET
      });
      
      // Verificar que las variables de entorno estén presentes
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error('Variables de Cloudinary faltantes:', {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'FALTA',
          api_key: process.env.CLOUDINARY_API_KEY ? 'OK' : 'FALTA', 
          api_secret: process.env.CLOUDINARY_API_SECRET ? 'OK' : 'FALTA'
        });
        
        return res.status(500).json({
          message: 'Error de configuración del servicio de imágenes - Variables de entorno faltantes',
          error: 'Cloudinary no configurado correctamente',
          variables: {
            cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
            api_key: !!process.env.CLOUDINARY_API_KEY,
            api_secret: !!process.env.CLOUDINARY_API_SECRET
          }
        });
      }
      
      // Re-configurar Cloudinary para asegurar que las variables estén cargadas
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      console.log('Cloudinary re-configurado exitosamente');
      console.log('Cloud name configurado:', cloudinary.config().cloud_name);
      
    } catch (configError) {
      console.error('Error al configurar Cloudinary:', configError);
      return res.status(500).json({
        message: 'Error de configuración del servicio de imágenes',
        error: configError.message
      });
    }

    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!tiposPermitidos.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: 'Tipo de archivo no permitido. Solo se aceptan: JPG, JPEG, PNG, GIF, WebP',
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

    console.log(`Archivo validado: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB)`);

    // Función mejorada para subir a Cloudinary usando stream
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        console.log('Creando stream de upload...');
        
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
          resource_type: 'image',
          timeout: 60000 // 60 segundos timeout
        };

        console.log('Opciones de upload:', options);

        const stream = cloudinary.uploader.upload_stream(
          options,
          (error, result) => {
            if (result) {
              console.log('Imagen subida a Cloudinary exitosamente!');
              console.log('URL:', result.secure_url);
              console.log('Public ID:', result.public_id);
              console.log('Bytes:', result.bytes);
              resolve(result);
            } else {
              console.error('Error en Cloudinary upload:', error);
              
              // Mensajes de error más específicos
              if (error.message && error.message.includes('Invalid API Key')) {
                reject(new Error('API Key de Cloudinary inválida. Verifica tus credenciales.'));
              } else if (error.message && error.message.includes('Invalid API Secret')) {
                reject(new Error('API Secret de Cloudinary inválido. Verifica tus credenciales.'));
              } else if (error.http_code === 401) {
                reject(new Error('Error de autenticación con Cloudinary. Verifica tus credenciales.'));
              } else {
                reject(new Error(`Error de Cloudinary: ${error.message || 'Error desconocido'}`));
              }
            }
          }
        );

        // Crear stream desde el buffer y conectarlo
        try {
          console.log('Enviando datos al stream...');
          streamifier.createReadStream(fileBuffer).pipe(stream);
          console.log('Datos enviados correctamente al stream');
        } catch (streamError) {
          console.error('Error al crear stream:', streamError);
          reject(new Error('Error al procesar el archivo: ' + streamError.message));
        }
      });
    };

    // Subir imagen a Cloudinary
    console.log('Subiendo a Cloudinary...');
    const cloudinaryResult = await streamUpload(req.file.buffer);

    // Guardar información en la base de datos
    console.log('Guardando información en base de datos...');
    
    const datosImagen = {
      urlimg: cloudinaryResult.secure_url
    };

    // Opcional: agregar campos adicionales si existen en tu modelo
    // datosImagen.public_id = cloudinaryResult.public_id;
    // datosImagen.formato = cloudinaryResult.format;
    // datosImagen.tamano = cloudinaryResult.bytes;
    // datosImagen.ancho = cloudinaryResult.width;
    // datosImagen.alto = cloudinaryResult.height;

    const nuevaImagen = await prisma.imagenes.create({
      data: datosImagen
    });

    console.log(`Imagen guardada exitosamente con ID: ${nuevaImagen.idimagen}`);
    console.log('=== SUBIDA COMPLETADA EXITOSAMENTE ===');

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
    console.error('=== ERROR EN SUBIDA DE IMAGEN ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    
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
      type: error.constructor.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Guardar imagen ya subida (solo URL)
exports.saveUrl = async (req, res) => {
  try {
    console.log('Guardando URL de imagen...');
    
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

    console.log(`URL guardada exitosamente con ID: ${nuevaImagen.idimagen}`);

    res.status(201).json({
      message: 'URL de imagen guardada exitosamente',
      imagen: nuevaImagen
    });

  } catch (error) {
    console.error('Error al guardar URL:', error);
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

    console.log(`Actualizando imagen ID: ${id}`);

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

    console.log(`Imagen actualizada: ${imagenActualizada.idimagen}`);

    res.json({
      message: 'Imagen actualizada exitosamente',
      imagen: imagenActualizada
    });

  } catch (error) {
    console.error('Error al actualizar imagen:', error);
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

    console.log(`Eliminando imagen ID: ${id}`);

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
        console.log(`Eliminando de Cloudinary: ${imagenExiste.public_id}`);
        await cloudinary.uploader.destroy(imagenExiste.public_id);
        console.log('Imagen eliminada de Cloudinary');
      } catch (cloudinaryError) {
        console.warn('No se pudo eliminar de Cloudinary:', cloudinaryError.message);
      }
    }
    */

    // Eliminar de la base de datos
    await prisma.imagenes.delete({ 
      where: { idimagen: id } 
    });

    console.log(`Imagen eliminada de la base de datos: ${id}`);

    res.json({ 
      message: 'Imagen eliminada correctamente',
      imagenEliminada: {
        id: imagenExiste.idimagen,
        url: imagenExiste.urlimg
      }
    });

  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    
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
    console.log('Generando estadísticas de imágenes...');

    const [totalImagenes, imagenesUsadas, imagenesNoUsadas] = await Promise.all([
      prisma.imagenes.count(),
      prisma.imagenes.count({
        where: {
          OR: [
            { productogeneral: { some: {} } },
            { categoriaproducto: { some: {} } }
          ]
        }
      }),
      prisma.imagenes.count({
        where: {
          AND: [
            { productogeneral: { none: {} } },
            { categoriaproducto: { none: {} } }
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

    console.log('Estadísticas generadas:', estadisticas);
    res.json(estadisticas);

  } catch (error) {
    console.error('Error al generar estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas', 
      error: error.message 
    });
  }
};

// Validar configuración de Cloudinary
exports.validateCloudinaryConfig = async (req, res) => {
  try {
    console.log('Validando configuración de Cloudinary...');
    
    const variables = {
      cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
      api_key: !!process.env.CLOUDINARY_API_KEY,
      api_secret: !!process.env.CLOUDINARY_API_SECRET
    };
    
    console.log('Variables de entorno:', variables);
    
    if (!variables.cloud_name || !variables.api_key || !variables.api_secret) {
      return res.status(500).json({
        message: 'Configuración de Cloudinary incompleta',
        variables,
        error: 'Faltan variables de entorno'
      });
    }
    
    try {
      // Re-configurar y hacer una prueba simple con Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      const testResult = await cloudinary.api.ping();
      
      res.json({
        message: 'Configuración de Cloudinary válida',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        status: testResult.status || 'ok',
        variables
      });
      
    } catch (cloudinaryError) {
      console.error('Error en prueba de Cloudinary:', cloudinaryError);
      res.status(500).json({
        message: 'Error al conectar con Cloudinary',
        error: cloudinaryError.message,
        variables
      });
    }

  } catch (error) {
    console.error('Error de configuración Cloudinary:', error);
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