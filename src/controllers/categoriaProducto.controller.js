const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary (asegurate de tener las variables de entorno)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función auxiliar para subir imagen a Cloudinary - CORREGIDA
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    console.log('Iniciando subida a Cloudinary...');
    console.log('Buffer recibido, tamaño:', fileBuffer ? fileBuffer.length : 'null');
    
    // Verificar que tenemos el buffer
    if (!fileBuffer) {
      console.error('No se recibió buffer de archivo');
      return reject(new Error('No se recibió buffer de archivo'));
    }

    // Verificar configuración de Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Variables de entorno de Cloudinary no configuradas');
      return reject(new Error('Variables de entorno de Cloudinary no configuradas'));
    }

    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'deliciasoft/categorias',
        resource_type: 'image', // Especificar que es una imagen
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('Error en Cloudinary:', error);
          reject(error);
        } else {
          console.log('Imagen subida exitosamente a Cloudinary:', result.secure_url);
          resolve(result);
        }
      }
    );

    // Escribir el buffer directamente al stream
    stream.write(fileBuffer);
    stream.end();
  });
};

// Obtener todas las categorías de producto
exports.getAll = async (req, res) => {
  try {
    const categorias = await prisma.categoriaproducto.findMany({
      include: {
        imagenes: true // Incluir la relación con imágenes
      }
    });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías de producto', error: error.message });
  }
};

// Obtener una categoría por ID
exports.getById = async (req, res) => {
  try {
    const categoria = await prisma.categoriaproducto.findUnique({
      where: { idcategoriaproducto: parseInt(req.params.id) },
      include: {
        imagenes: true // Incluir la relación con imágenes
      }
    });
    
    if (!categoria) return res.status(404).json({ message: 'Categoría de producto no encontrada' });
    
    // Mapear para incluir campo imagen por compatibilidad
    const categoriaConImagen = {
      ...categoria,
      imagen: categoria.imagenes ? categoria.imagenes.urlimg : null
    };
    
    res.json(categoriaConImagen);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la categoría de producto', error: error.message });
  }
};

// Crear nueva categoría de producto - CORREGIDA
exports.create = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    
    console.log('=== CREAR CATEGORÍA ===');
    console.log('Datos recibidos:', { nombrecategoria, descripcion, estado });
    console.log('Archivo recibido:', req.file ? 'SÍ' : 'NO');
    if (req.file) {
      console.log('Detalles del archivo:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer ? req.file.buffer.length : 'sin buffer'
      });
    }
    
    // Validaciones básicas
    if (!nombrecategoria || nombrecategoria.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
    }
    
    if (!descripcion || descripcion.trim() === '') {
      return res.status(400).json({ message: 'La descripción es obligatoria' });
    }
    
    if (nombrecategoria.length > 20) {
      return res.status(400).json({ message: 'El nombre no puede tener más de 20 caracteres' });
    }
    
    if (descripcion.length > 50) {
      return res.status(400).json({ message: 'La descripción no puede tener más de 50 caracteres' });
    }

    // Datos base para crear la categoría
    const datosCategoria = { 
      nombrecategoria: nombrecategoria.trim(), 
      descripcion: descripcion.trim(), 
      estado: estado !== undefined ? Boolean(JSON.parse(estado)) : true 
    };

    // Si hay imagen, subirla primero
    let imagenId = null;
    if (req.file && req.file.buffer) {
      try {
        console.log('Subiendo imagen a Cloudinary...');
        const result = await uploadToCloudinary(req.file.buffer);
        console.log('Resultado de Cloudinary:', result.secure_url);
        
        // Crear registro en tabla imagenes
        const nuevaImagen = await prisma.imagenes.create({
          data: {
            urlimg: result.secure_url
          }
        });
        
        imagenId = nuevaImagen.idimagen;
        console.log('Imagen guardada en BD con ID:', imagenId);
      } catch (imageError) {
        console.error('Error al subir imagen:', imageError);
        // Continúar sin imagen en lugar de fallar completamente
        console.log('Continuando sin imagen...');
      }
    }

    // Agregar ID de imagen si existe
    if (imagenId) {
      datosCategoria.idimagencat = imagenId;
    }

    console.log('Creando categoría con datos finales:', datosCategoria);

    // Crear la categoría
    const nuevaCategoria = await prisma.categoriaproducto.create({
      data: datosCategoria,
      include: {
        imagenes: true
      }
    });

    console.log('Categoría creada exitosamente:', nuevaCategoria);

    // Mapear respuesta para incluir campo imagen por compatibilidad
    const categoriaRespuesta = {
      ...nuevaCategoria,
      imagen: nuevaCategoria.imagenes ? nuevaCategoria.imagenes.urlimg : null
    };

    res.status(201).json(categoriaRespuesta);
  } catch (error) {
    console.error('Error completo al crear categoría:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    
    res.status(500).json({ message: 'Error al crear la categoría de producto', error: error.message });
  }
};

// Actualizar categoría de producto - CORREGIDA
exports.update = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    const id = parseInt(req.params.id);
    
    console.log('=== ACTUALIZAR CATEGORÍA ===');
    console.log('ID:', id);
    console.log('Datos recibidos:', { nombrecategoria, descripcion, estado });
    console.log('Archivo recibido:', req.file ? 'SÍ' : 'NO');
    
    // Verificar si existe la categoría
    const categoriaExistente = await prisma.categoriaproducto.findUnique({
      where: { idcategoriaproducto: id },
      include: { imagenes: true }
    });
    
    if (!categoriaExistente) {
      return res.status(404).json({ message: 'Categoría de producto no encontrada' });
    }
    
    // Validaciones básicas
    if (nombrecategoria !== undefined) {
      if (!nombrecategoria || nombrecategoria.trim() === '') {
        return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
      }
      if (nombrecategoria.length > 20) {
        return res.status(400).json({ message: 'El nombre no puede tener más de 20 caracteres' });
      }
    }
    
    if (descripcion !== undefined) {
      if (!descripcion || descripcion.trim() === '') {
        return res.status(400).json({ message: 'La descripción es obligatoria' });
      }
      if (descripcion.length > 50) {
        return res.status(400).json({ message: 'La descripción no puede tener más de 50 caracteres' });
      }
    }

    let imagenId = categoriaExistente.idimagencat;
    
    // Si hay nueva imagen, subirla
    if (req.file && req.file.buffer) {
      try {
        console.log('Subiendo nueva imagen a Cloudinary...');
        const result = await uploadToCloudinary(req.file.buffer);
        
        const nuevaImagen = await prisma.imagenes.create({
          data: {
            urlimg: result.secure_url
          }
        });
        
        imagenId = nuevaImagen.idimagen;
        console.log('Nueva imagen guardada con ID:', imagenId);
        
        // Eliminar imagen anterior si existía
        if (categoriaExistente.idimagencat) {
          try {
            await prisma.imagenes.delete({
              where: { idimagen: categoriaExistente.idimagencat }
            });
            console.log('Imagen anterior eliminada');
          } catch (deleteError) {
            console.error('Error al eliminar imagen anterior:', deleteError);
          }
        }
      } catch (imageError) {
        console.error('Error al subir nueva imagen:', imageError);
        // No fallar la actualización si falla la imagen
      }
    }
    
    // Preparar datos para actualización
    const datosActualizacion = {};
    if (nombrecategoria !== undefined) datosActualizacion.nombrecategoria = nombrecategoria.trim();
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion.trim();
    if (estado !== undefined) datosActualizacion.estado = Boolean(JSON.parse(estado));
    datosActualizacion.idimagencat = imagenId;
    
    console.log('Actualizando con datos:', datosActualizacion);
    
    const actualizada = await prisma.categoriaproducto.update({
      where: { idcategoriaproducto: id },
      data: datosActualizacion,
      include: {
        imagenes: true
      }
    });
    
    // Mapear respuesta para incluir campo imagen por compatibilidad
    const categoriaRespuesta = {
      ...actualizada,
      imagen: actualizada.imagenes ? actualizada.imagenes.urlimg : null
    };
    
    res.json(categoriaRespuesta);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ message: 'Error al actualizar la categoría de producto', error: error.message });
  }
};

// Cambiar estado de categoría
exports.toggleEstado = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const categoriaActual = await prisma.categoriaproducto.findUnique({
      where: { idcategoriaproducto: id }
    });
    
    if (!categoriaActual) {
      return res.status(404).json({ message: 'Categoría de producto no encontrada' });
    }
    
    const nuevoEstado = !categoriaActual.estado;
    
    const categoriaActualizada = await prisma.categoriaproducto.update({
      where: { idcategoriaproducto: id },
      data: { estado: nuevoEstado },
      include: {
        imagenes: true
      }
    });
    
    res.json({
      ...categoriaActualizada,
      imagen: categoriaActualizada.imagenes ? categoriaActualizada.imagenes.urlimg : null,
      message: `Categoría ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar estado de la categoría', error: error.message });
  }
};

// Eliminar categoría de producto
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const categoriaExistente = await prisma.categoriaproducto.findUnique({
      where: { idcategoriaproducto: id },
      include: { imagenes: true }
    });
    
    if (!categoriaExistente) {
      return res.status(404).json({ message: 'Categoría de producto no encontrada' });
    }
    
    const productosAsociados = await prisma.productogeneral.findMany({
      where: { idcategoriaproducto: id }
    });
    
    if (productosAsociados.length > 0) {
      return res.status(409).json({ 
        message: 'No se puede eliminar una categoría que tiene productos asociados',
        productosCount: productosAsociados.length
      });
    }
    
    // Eliminar la imagen asociada si existe
    if (categoriaExistente.idimagencat) {
      try {
        await prisma.imagenes.delete({
          where: { idimagen: categoriaExistente.idimagencat }
        });
      } catch (imageError) {
        console.error('Error al eliminar imagen:', imageError);
      }
    }
    
    await prisma.categoriaproducto.delete({
      where: { idcategoriaproducto: id }
    });
    
    res.json({ message: 'Categoría de producto eliminada correctamente' });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'No se puede eliminar la categoría porque tiene productos asociados' });
    }
    res.status(500).json({ message: 'Error al eliminar la categoría de producto', error: error.message });
  }
};

// Obtener productos asociados a una categoría
exports.getProductosPorCategoria = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const productos = await prisma.productogeneral.findMany({
      where: { idcategoriaproducto: id },
      select: {
        idproductogeneral: true,
        nombreproducto: true,
        precioproducto: true,
        estado: true
      }
    });
    
    res.json(productos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos de la categoría', error: error.message });
  }
};

// Función de prueba - agregar temporalmente
exports.testCloudinary = async (req, res) => {
  try {
    console.log('Configuración de Cloudinary:');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado' : 'No configurado');
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Configurado' : 'No configurado');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Configurado' : 'No configurado');
    
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      res.json({ message: 'Imagen subida exitosamente', url: result.secure_url });
    } else {
      res.status(400).json({ message: 'No se recibió archivo' });
    }
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({ message: 'Error en test', error: error.message });
  }
};

// Obtener solo categorías activas
exports.getActive = async (req, res) => {
  try {
    const categoriasActivas = await prisma.categoriaproducto.findMany({
      where: { estado: true },
      include: {
        imagenes: true
      },
      orderBy: { nombrecategoria: 'asc' }
    });
    
    // Mapear para incluir campo imagen por compatibilidad
    const categoriasMapeadas = categoriasActivas.map(categoria => ({
      ...categoria,
      imagen: categoria.imagenes ? categoria.imagenes.urlimg : null
    }));
    
    res.json(categoriasMapeadas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías activas', error: error.message });
  }
};