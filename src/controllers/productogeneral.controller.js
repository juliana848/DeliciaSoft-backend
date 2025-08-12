const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los productos generales
exports.getAll = async (req, res) => {
  try {
    const productos = await prisma.productogeneral.findMany();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
};

// Obtener producto general por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const producto = await prisma.productogeneral.findUnique({
      where: { idproductogeneral: id }
    });
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producto', error: error.message });
  }
};

// Crear producto general
exports.create = async (req, res) => {
  try {
    const {
      nombreproducto,
      precioproducto,
      cantidadproducto,
      estado,
      idcategoriaproducto,
      idimagen,
      idreceta
    } = req.body;

    const nuevoProducto = await prisma.productogeneral.create({
      data: {
        nombreproducto,
        precioproducto: precioproducto ? parseFloat(precioproducto) : null,
        cantidadproducto: cantidadproducto ? parseFloat(cantidadproducto) : null,
        estado,
        idcategoriaproducto,
        idimagen,
        idreceta
      }
    });

    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

// Actualizar producto general
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      nombreproducto,
      precioproducto,
      cantidadproducto,
      estado,
      idcategoriaproducto,
      idimagen,
      idreceta
    } = req.body;

    const productoExiste = await prisma.productogeneral.findUnique({ where: { idproductogeneral: id } });
    if (!productoExiste) return res.status(404).json({ message: 'Producto no encontrado' });

    const actualizado = await prisma.productogeneral.update({
      where: { idproductogeneral: id },
      data: {
        nombreproducto,
        precioproducto: precioproducto ? parseFloat(precioproducto) : null,
        cantidadproducto: cantidadproducto ? parseFloat(cantidadproducto) : null,
        estado,
        idcategoriaproducto,
        idimagen,
        idreceta
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

// Eliminar producto general
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const productoExiste = await prisma.productogeneral.findUnique({ where: { idproductogeneral: id } });
    if (!productoExiste) return res.status(404).json({ message: 'Producto no encontrado' });

    await prisma.productogeneral.delete({ where: { idproductogeneral: id } });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};
