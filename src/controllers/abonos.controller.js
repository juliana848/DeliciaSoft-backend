const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAbonos = async (req, res) => {
  try {
    const abonos = await prisma.abonos.findMany();
    res.json(abonos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener abonos", error: error.message });
  }
};

const getAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const abono = await prisma.abonos.findUnique({
      where: { idabono: id }
    });
    if (!abono) return res.status(404).json({ message: "Abono no encontrado" });
    res.json(abono);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener abono", error: error.message });
  }
};

const createAbono = async (req, res) => {
  try {
    const nuevoAbono = await prisma.abonos.create({
      data: req.body
    });
    res.status(201).json(nuevoAbono);
  } catch (error) {
    res.status(500).json({ message: "Error al crear abono", error: error.message });
  }
};

const updateAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const abonoActualizado = await prisma.abonos.update({
      where: { idabono: id },
      data: req.body
    });
    res.json(abonoActualizado);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar abono", error: error.message });
  }
};

const deleteAbono = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.abonos.delete({ where: { idabono: id } });
    res.json({ message: "Abono eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar abono", error: error.message });
  }
};

const getAbonosByPedidoId = async (req, res) => {
  const idPedido = parseInt(req.params.idPedido);
  try {
    const abonos = await prisma.abonos.findMany({
      where: { idpedido: idPedido },
      select: {
        idabono: true,
        idpedido: true,
        metodopago: true,
        cantidadpagar: true,
        idimagen: true,
        imagenes: {
          select: { urlimg: true }
        }
      }
    });

    const resultado = abonos.map(a => ({
      idabono: a.idabono,
      idpedido: a.idpedido,
      metodopago: a.metodopago,
      cantidadpagar: a.cantidadpagar,
      idimagen: a.idimagen,
      urlimagen: a.imagenes ? a.imagenes.urlimg : null
    }));

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener abonos por pedido", error: error.message });
  }
};

module.exports = {
  getAbonos,
  getAbono,
  createAbono,
  updateAbono,
  deleteAbono,
  getAbonosByPedidoId
};
