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

// Eliminar cliente
const deleteCliente = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.cliente.delete({ where: { idcliente: id } });
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar cliente", error: error.message });
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
    const ventas = await prisma.venta.findMany({
      where: { idcliente: id }
    });
    
    res.json({ tieneVentas: ventas.length > 0, cantidadVentas: ventas.length });
  } catch (error) {
    res.status(500).json({ message: "Error al verificar ventas", error: error.message });
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
