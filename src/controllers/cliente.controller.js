const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Validar cliente por correo y contraseña
const validateCliente = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { correo }
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    if (cliente.hashcontrasena !== contrasena) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    return res.json({
      idcliente: cliente.idcliente,
      nombre: cliente.nombre,
      correo: cliente.correo
    });
  } catch (error) {
    res.status(500).json({ message: "Error al validar cliente", error: error.message });
  }
};

// Obtener todos los clientes
const getClientes = async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener clientes", error: error.message });
  }
};

// Obtener cliente por ID
const getCliente = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const cliente = await prisma.cliente.findUnique({ where: { idcliente: id } });
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener cliente", error: error.message });
  }
};

// Crear cliente
const createCliente = async (req, res) => {
  try {
    const nuevoCliente = await prisma.cliente.create({
      data: req.body
    });
    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error("❌ Error Prisma:", error);
    res.status(500).json({ message: "Error al crear cliente", error: error.message });
  }
};

// Actualizar cliente
const updateCliente = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const clienteActualizado = await prisma.cliente.update({
      where: { idcliente: id },
      data: req.body
    });
    res.json(clienteActualizado);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar cliente", error: error.message });
  }
};

// Eliminar cliente - VERSIÓN CORREGIDA CON NOMBRES CORRECTOS DEL SCHEMA
const deleteCliente = async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    // Intentar eliminar directamente
    await prisma.cliente.delete({ 
      where: { idcliente: id } 
    });
    
    return res.json({ 
      message: "Cliente eliminado correctamente",
      success: true
    });
    
  } catch (error) {
    console.error("Error al eliminar cliente:", error.code, error.message);
    
    // Error P2003: Violación de clave foránea (tiene ventas asociadas)
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: "No se puede eliminar el cliente porque está asociado a una venta",
        tieneVentas: true
      });
    }
    
    // Error P2025: Registro no encontrado
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: "Cliente no encontrado"
      });
    }
    
    // Cualquier otro error
    return res.status(500).json({ 
      message: "Error al eliminar cliente", 
      error: error.message 
    });
  }
};

// Cambiar estado del cliente
const toggleEstadoCliente = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    // Buscar cliente
    const cliente = await prisma.cliente.findUnique({ where: { idcliente: id } });
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    // Invertir estado actual (si es null, lo pongo en true por defecto)
    const nuevoEstado = cliente.estado === true ? false : true;

    const clienteActualizado = await prisma.cliente.update({
      where: { idcliente: id },
      data: { estado: nuevoEstado }
    });

    res.json({
      message: `Cliente ${nuevoEstado ? "activado" : "desactivado"} correctamente`,
      cliente: clienteActualizado
    });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar estado", error: error.message });
  }
};

// Verificar si cliente tiene ventas asociadas
const clienteTieneVentas = async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { idcliente: id }
    });

    if (!cliente) {
      return res.json({ 
        tieneVentas: false,
        cantidadVentas: 0
      });
    }

    // Intentar contar ventas
    try {
      const cantidadVentas = await prisma.venta.count({
        where: { idcliente: id }
      });
      
      return res.json({ 
        tieneVentas: cantidadVentas > 0, 
        cantidadVentas: cantidadVentas 
      });
    } catch (ventaError) {
      // Si hay error al acceder a la tabla venta, asumir que no hay ventas
      return res.json({ 
        tieneVentas: false, 
        cantidadVentas: 0
      });
    }
  } catch (error) {
    console.error("Error al verificar ventas:", error);
    return res.json({ 
      tieneVentas: false, 
      cantidadVentas: 0
    });
  }
};

// Actualizar contraseña de cliente
const actualizarContrasenaCliente = async (req, res) => {
  const id = parseInt(req.params.id);
  const { nuevaContrasena } = req.body;

  try {
    const clienteActualizado = await prisma.cliente.update({
      where: { idcliente: id },
      data: { hashcontrasena: nuevaContrasena }
    });
    
    res.json({ 
      message: "Contraseña actualizada correctamente", 
      cliente: clienteActualizado 
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar contraseña", error: error.message });
  }
};


module.exports = {
  validateCliente,
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  toggleEstadoCliente,
  clienteTieneVentas,          
  actualizarContrasenaCliente  
};