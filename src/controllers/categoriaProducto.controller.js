const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configurar Cloudinary (asegurate de tener las variables de entorno)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// Función auxiliar para subir imagen a Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'deliciasoft/categorias',
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Crear nueva categoría de producto
exports.create = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    
    console.log('Datos recibidos:', { nombrecategoria, descripcion, estado });
    console.log('Archivo recibido:', req.file ? 'Sí' : 'No');
    
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
      estado: estado !== undefined ? Boolean(estado) : true 
    };

    // Si hay imagen, subirla primero
    let imagenId = null;
    if (req.file) {
      try {
        console.log('Subiendo imagen a Cloudinary...');
        const result = await uploadToCloudinary(req.file.buffer);
        console.log('Imagen subida exitosamente:', result.secure_url);
        
        const nuevaImagen = await prisma.imagenes.create({
          data: {
            urlimg: result.secure_url
          }
        });
        
        imagenId = nuevaImagen.idimagen;
        console.log('Imagen guardada en BD con ID:', imagenId);
      } catch (imageError) {
        console.error('Error al subir imagen:', imageError);
        // No fallar la creación de categoría si falla la imagen
      }
    }

    // Agregar ID de imagen si existe
    if (imagenId) {
      datosCategoria.idimagencat = imagenId;
    }

    console.log('Creando categoría con datos:', datosCategoria);

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
    
    // Si el error es relacionado con el campo idimagencat
    if (error.message && error.message.includes('idimagencat')) {
      return res.status(500).json({ 
        message: 'Error de base de datos: El campo de imagen no está configurado. Ejecuta las migraciones primero.',
        error: error.message 
      });
    }
    
    res.status(500).json({ message: 'Error al crear la categoría de producto', error: error.message });
  }
};

// Actualizar categoría de producto
exports.update = async (req, res) => {
  try {
    const { nombrecategoria, descripcion, estado } = req.body;
    const id = parseInt(req.params.id);
    
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
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        
        const nuevaImagen = await prisma.imagenes.create({
          data: {
            urlimg: result.secure_url
          }
        });
        
        imagenId = nuevaImagen.idimagen;
        
        // Eliminar imagen anterior si existía
        if (categoriaExistente.idimagencat) {
          try {
            await prisma.imagenes.delete({
              where: { idimagen: categoriaExistente.idimagencat }
            });
          } catch (deleteError) {
            console.error('Error al eliminar imagen anterior:', deleteError);
          }
        }
      } catch (imageError) {
        console.error('Error al subir nueva imagen:', imageError);
        // No fallar la actualización si falla la imagen
      }
    }
    
    const actualizada = await prisma.categoriaproducto.update({
      where: { idcategoriaproducto: id },
      data: { 
        nombrecategoria: nombrecategoria ? nombrecategoria.trim() : undefined,
        descripcion: descripcion ? descripcion.trim() : undefined,
        estado,
        idimagencat: imagenId
      },
      include: {
        imagenes: true
      }
    });
    
    res.json(actualizada);
  } catch (error) {
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
    res.json(categoriasActivas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías activas', error: error.message });
  }
};