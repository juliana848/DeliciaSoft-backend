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

// Eliminar cliente - CON VALIDACIÓN DE VENTAS ASOCIADAS
const deleteCliente = async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    // Primero verificar que el cliente existe
    const clienteExiste = await prisma.cliente.findUnique({
      where: { idcliente: id }
    });

    if (!clienteExiste) {
      return res.status(404).json({ 
        message: "Cliente no encontrado"
      });
    }

    // Verificar si tiene ventas asociadas
    const ventasAsociadas = await prisma.venta.count({
      where: { idcliente: id }
    });

    if (ventasAsociadas > 0) {
      return res.status(400).json({ 
        message: "No se puede eliminar el cliente porque está asociado a una venta",
        tieneVentas: true,
        cantidadVentas: ventasAsociadas
      });
    }

    // Si no tiene ventas, proceder con la eliminación
    await prisma.cliente.delete({ 
      where: { idcliente: id } 
    });
    
    res.json({ 
      message: "Cliente eliminado correctamente",
      success: true
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: "No se puede eliminar el cliente porque está asociado a una venta",
        tieneVentas: true
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: "Cliente no encontrado"
      });
    }
    
    // Para cualquier otro error
    res.status(500).json({ 
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

// Verificar si cliente tiene ventas asociadas - CON MANEJO DE ERRORES
const clienteTieneVentas = async (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    // Primero verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { idcliente: id }
    });

    if (!cliente) {
      return res.status(404).json({ 
        message: "Cliente no encontrado",
        tieneVentas: false,
        cantidadVentas: 0
      });
    }

    // Contar las ventas asociadas
    const cantidadVentas = await prisma.venta.count({
      where: { idcliente: id }
    });
    
    res.json({ 
      tieneVentas: cantidadVentas > 0, 
      cantidadVentas: cantidadVentas 
    });
  } catch (error) {
    console.error("Error al verificar ventas:", error);
    
    // En caso de error, devolver respuesta segura
    res.status(200).json({ 
      tieneVentas: false, 
      cantidadVentas: 0,
      error: "No se pudo verificar ventas" 
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