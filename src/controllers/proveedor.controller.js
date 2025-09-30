const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Validar que un valor sea numérico
const esNumeroValido = (valor) => {
  if (!valor) return true; // Permitir valores vacíos
  const str = valor.toString().trim();
  return /^\d+$/.test(str); // Solo acepta dígitos
};

// 🆕 Función para verificar si tiene compras recientes (menos de 1 mes)
const tieneComprasRecientes = async (idProveedor) => {
  const unMesAtras = new Date();
  unMesAtras.setMonth(unMesAtras.getMonth() - 1);
  
  const comprasRecientes = await prisma.compra.count({
    where: {
      idproveedor: idProveedor,
      fechacompra: {
        gte: unMesAtras
      },
      estado: true // Solo compras activas
    }
  });
  
  return comprasRecientes > 0;
};

// Obtener todos los proveedores
exports.getAll = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany();
    res.json(proveedores);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proveedores', error: error.message });
  }
};

// Obtener proveedor por id
exports.getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const proveedor = await prisma.proveedor.findUnique({
      where: { idproveedor: id }   
    });
    
    if (!proveedor) return res.status(404).json({ message: 'Proveedor no encontrado' });
    
    res.json(proveedor);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proveedor', error: error.message });
  }
};

// Crear proveedor
exports.create = async (req, res) => {
  try {
    const {
      tipodocumento,
      documento,
      nombreempresa,
      nombreproveedor,
      contacto,
      correo,
      direccion,
      estado,
      TipoProveedor
    } = req.body;

    // Validar documento
    if (documento) {
      const docStr = documento.toString().trim();
      if (!esNumeroValido(docStr)) {
        return res.status(400).json({ 
          message: 'El documento contiene caracteres inválidos. Solo se permiten números.' 
        });
      }
    }

    // Validar contacto/teléfono
    if (contacto) {
      const contactoStr = contacto.toString().trim();
      if (!esNumeroValido(contactoStr)) {
        return res.status(400).json({ 
          message: 'El teléfono contiene caracteres inválidos. Solo se permiten números.' 
        });
      }
    }

    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        tipodocumento,
        documento: documento ? documento.toString().trim() : null,
        nombreempresa,
        nombreproveedor,
        contacto: contacto ? contacto.toString().trim() : null,
        correo,
        direccion,
        estado,
        TipoProveedor
      }
    });

    res.status(201).json(nuevoProveedor);
  } catch (error) {
    console.error("Error en create proveedor:", error);
    res.status(500).json({ message: 'Error al crear proveedor', error: error.message });
  }
};

// Actualizar proveedor
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      tipodocumento,
      documento,
      nombreempresa,
      nombreproveedor,
      contacto,
      correo,
      direccion,
      estado
    } = req.body;

    // Validar documento
    if (documento) {
      const docStr = documento.toString().trim();
      if (!esNumeroValido(docStr)) {
        return res.status(400).json({ 
          message: 'El documento contiene caracteres inválidos. Solo se permiten números.' 
        });
      }
    }

    // Validar contacto/teléfono
    if (contacto) {
      const contactoStr = contacto.toString().trim();
      if (!esNumeroValido(contactoStr)) {
        return res.status(400).json({ 
          message: 'El teléfono contiene caracteres inválidos. Solo se permiten números.' 
        });
      }
    }

    // Buscar proveedor existente
    const proveedorExiste = await prisma.proveedor.findUnique({ 
      where: { idproveedor: id } 
    });

    if (!proveedorExiste) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    // 🆕 VALIDACIÓN: Si intentan deshabilitar, verificar compras recientes
    if (estado === false && proveedorExiste.estado === true) {
      const tieneCompras = await tieneComprasRecientes(id);
      if (tieneCompras) {
        return res.status(400).json({ 
          message: 'No se puede deshabilitar el proveedor porque tiene compras registradas en el último mes' 
        });
      }
    }

    // Actualizar proveedor
    const actualizado = await prisma.proveedor.update({
      where: { idproveedor: id },
      data: {
        tipodocumento,
        documento: documento ? documento.toString().trim() : null,
        nombreempresa,
        nombreproveedor,
        contacto: contacto ? contacto.toString().trim() : null,
        correo,
        direccion,
        estado
      }
    });

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar proveedor', error: error.message });
  }
};

// Eliminar proveedor
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const proveedorExiste = await prisma.proveedor.findUnique({ 
      where: { idproveedor: id } 
    });

    if (!proveedorExiste) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    await prisma.proveedor.delete({ where: { idproveedor: id } });

    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al eliminar proveedor', 
      error: error.message 
    });
  }
};