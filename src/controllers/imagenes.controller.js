// Subir imagen a Cloudinary y guardar URL en BD - VERSION CORREGIDA
exports.uploadImage = async (req, res) => {
  try {
    console.log('📤 Iniciando subida de imagen...');
    console.log('📄 Datos de request:', {
      hasFile: !!req.file,
      body: req.body,
      fieldName: req.file?.fieldname || 'no file'
    });
    
    // ✅ Validar que se recibió un archivo
    if (!req.file) {
      console.error('❌ No se recibió archivo');
      return res.status(400).json({ 
        message: 'No se recibió ningún archivo. Asegúrate de usar el campo "image" o "imagen" en el formulario.' 
      });
    }

    console.log('📄 Archivo recibido:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    });

    // ✅ CORRECCIÓN PRINCIPAL: Re-configurar Cloudinary explícitamente
    try {
      console.log('🔧 Re-configurando Cloudinary...');
      console.log('Variables disponibles:', {
        cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
        api_key: !!process.env.CLOUDINARY_API_KEY,
        api_secret: !!process.env.CLOUDINARY_API_SECRET
      });
      
      // Re-configurar Cloudinary para asegurar que las variables estén cargadas
      const cloudinaryConfig = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      };
      
      // Verificar que todas las variables estén presentes
      if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
        console.error('❌ Variables de Cloudinary faltantes:', {
          cloud_name: cloudinaryConfig.cloud_name ? 'OK' : 'FALTA',
          api_key: cloudinaryConfig.api_key ? 'OK' : 'FALTA', 
          api_secret: cloudinaryConfig.api_secret ? 'OK' : 'FALTA'
        });
        
        return res.status(500).json({
          message: 'Error de configuración del servicio de imágenes - Variables de entorno faltantes',
          error: 'Cloudinary no configurado correctamente'
        });
      }
      
      // Aplicar la configuración
      cloudinary.config(cloudinaryConfig);
      console.log('✅ Cloudinary re-configurado exitosamente');
      
    } catch (configError) {
      console.error('❌ Error al configurar Cloudinary:', configError);
      return res.status(500).json({
        message: 'Error de configuración del servicio de imágenes',
        error: configError.message
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

    console.log(`📄 Archivo validado: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB)`);

    // ✅ Función mejorada para subir a Cloudinary
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        console.log('☁️ Iniciando stream upload...');
        
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

        const stream = cloudinary.uploader.upload_stream(
          options,
          (error, result) => {
            if (result) {
              console.log('✅ Imagen subida a Cloudinary:', result.public_id);
              console.log('🔗 URL generada:', result.secure_url);
              resolve(result);
            } else {
              console.error('❌ Error en Cloudinary:', error);
              
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

        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    // Subir imagen a Cloudinary
    console.log('☁️ Subiendo a Cloudinary...');
    const cloudinaryResult = await streamUpload(req.file.buffer);

    // Guardar información en la base de datos
    console.log('💾 Guardando información en base de datos...');
    
    const datosImagen = {
      urlimg: cloudinaryResult.secure_url
    };

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