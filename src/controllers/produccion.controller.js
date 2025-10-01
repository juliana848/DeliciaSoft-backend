const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todas las producciones
exports.getAll = async (req, res) => {
  try {
    const producciones = await prisma.produccion.findMany({
      orderBy: {
        idproduccion: 'desc'
      }
    });
    res.json(producciones);
  } catch (error) {
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
    // Obtener el último pedido
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
      // Extraer el número del formato P-001
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

// Crear producción
exports.create = async (req, res) => {
  try {
    console.log('📦 Datos recibidos en el backend:', req.body);
    
    const { 
      TipoProduccion, 
      nombreproduccion,
      fechapedido, 
      fechaentrega
    } = req.body;

    // Validaciones
    if (!TipoProduccion) {
      return res.status(400).json({ message: 'El tipo de producción es requerido' });
    }

    if (!nombreproduccion || nombreproduccion.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la producción es requerido' });
    }

    // Generar número de pedido automáticamente si es tipo "pedido"
    let numeropedido = '';
    if (TipoProduccion.toLowerCase() === 'pedido') {
      numeropedido = await generarNumeroPedido();
      console.log('🔢 Número de pedido generado:', numeropedido);
    }

    // ✅ Asignar estados automáticamente según el tipo
    const estadoproduccion = TipoProduccion.toLowerCase() === 'fabrica' ? 1 : 2; // Pendiente para fábrica, Empaquetando para pedido
    const estadopedido = TipoProduccion.toLowerCase() === 'pedido' ? 1 : null; // Abonado para pedido

    // Crear el objeto de datos
    const datosProduccion = {
      TipoProduccion: TipoProduccion,
      nombreproduccion: nombreproduccion.trim(),
      fechapedido: fechapedido ? new Date(fechapedido) : new Date(),
      fechaentrega: fechaentrega && TipoProduccion.toLowerCase() === 'pedido' ? new Date(fechaentrega) : null,
      numeropedido: numeropedido,
      estadoproduccion: estadoproduccion,
      estadopedido: estadopedido
    };

    console.log('💾 Guardando producción con datos:', datosProduccion);

    const nuevaProduccion = await prisma.produccion.create({
      data: datosProduccion
    });

    console.log('✅ Producción creada:', nuevaProduccion);

    res.status(201).json(nuevaProduccion);
  } catch (error) {
    console.error('❌ Error al crear producción:', error);
    res.status(500).json({ 
      message: 'Error al crear producción', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Actualizar producción
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      TipoProduccion,
      nombreproduccion,
      fechapedido, 
      fechaentrega, 
      numeropedido, 
      estadoproduccion 
    } = req.body;

    const produccionExiste = await prisma.produccion.findUnique({ 
      where: { idproduccion: id } 
    });
    
    if (!produccionExiste) {
      return res.status(404).json({ message: 'Producción no encontrada' });
    }

    const datosActualizacion = {};

    if (TipoProduccion !== undefined) datosActualizacion.TipoProduccion = TipoProduccion;
    if (nombreproduccion !== undefined) datosActualizacion.nombreproduccion = nombreproduccion.trim();
    if (fechapedido !== undefined) datosActualizacion.fechapedido = fechapedido ? new Date(fechapedido) : null;
    if (fechaentrega !== undefined) datosActualizacion.fechaentrega = fechaentrega ? new Date(fechaentrega) : null;
    if (numeropedido !== undefined) datosActualizacion.numeropedido = numeropedido;
    if (estadoproduccion !== undefined) datosActualizacion.estadoproduccion = estadoproduccion;

    const actualizada = await prisma.produccion.update({
      where: { idproduccion: id },
      data: datosActualizacion
    });

    res.json(actualizada);
  } catch (error) {
    console.error('Error al actualizar producción:', error);
    res.status(500).json({ 
      message: 'Error al actualizar producción', 
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