const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API DeliciaSoft funcionando 🚀');
});

// Importar rutas
const clienteRoutes = require('./routes/cliente.routes');
app.use('/api/clientes', clienteRoutes);

const abonosRoutes = require('./routes/abonos.routes');
app.use('/api/abonos', abonosRoutes);

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const catalogoAdicionesRoutes = require('./routes/catalogoAdiciones.routes');
app.use('/api/catalogo-adiciones', catalogoAdicionesRoutes);

const catalogoRellenoRoutes = require('./routes/catalogoRelleno.routes');
app.use('/api/catalogo-relleno', catalogoRellenoRoutes);

const catalogoSaborRoutes = require('./routes/catalogoSabor.routes');
app.use('/api/catalogo-sabor', catalogoSaborRoutes);

const categoriaInsumosRoutes = require('./routes/categoriaInsumos.routes');
app.use('/api/categoria-insumos', categoriaInsumosRoutes);

const categoriaProductoRoutes = require('./routes/categoriaProducto.routes');
app.use('/api/categoria-productos', categoriaProductoRoutes);

const compraRoutes = require('./routes/compra.routes');
app.use('/api/compras', compraRoutes);

const detalleAdicionesRoutes = require('./routes/detalleadiciones.routes');
app.use('/api/detalleadiciones', detalleAdicionesRoutes);

const detalleCompraRoutes = require('./routes/detallecompra.routes');
app.use('/api/detallecompra', detalleCompraRoutes);

const detalleProduccionRoutes = require('./routes/detalleproduccion.routes');
app.use('/api/detalleproduccion', detalleProduccionRoutes);

const detalleRecetaRoutes = require('./routes/detallereceta.routes');
app.use('/api/detallereceta', detalleRecetaRoutes);

const detalleVentaRoutes = require('./routes/detalleventa.routes');
app.use('/api/detalleventa', detalleVentaRoutes);

const estadoproduccionRoutes = require('./routes/estadoproduccion.routes');
app.use('/api/estadoproduccion', estadoproduccionRoutes);

const estadoventaRoutes = require('./routes/estadoventa.routes');
app.use('/api/estadoventa', estadoventaRoutes);

const imagenesRoutes = require('./routes/imagenes.routes');
app.use('/api/imagenes', imagenesRoutes);

const insumosRoutes = require('./routes/insumos.routes');
app.use('/api/insumos', insumosRoutes);

const pedidoRoutes = require('./routes/pedido.routes');
app.use('/api/pedido', pedidoRoutes);

const permisosRoutes = require('./routes/permisos.routes');
app.use('/api/permisos', permisosRoutes);

const produccionRoutes = require('./routes/produccion.routes');
app.use('/api/produccion', produccionRoutes);

const produccionEstadoRoutes = require('./routes/produccionEstado.routes');
app.use('/api/produccion_estado', produccionEstadoRoutes);

const productogeneralRoutes = require('./routes/productogeneral.routes');
app.use('/api/productogeneral', productogeneralRoutes);

const proveedorRoutes = require('./routes/proveedor.routes');
app.use('/api/proveedor', proveedorRoutes);

const recetaRoutes = require('./routes/receta.routes');
app.use('/api/receta', recetaRoutes);

const rolRoutes = require('./routes/rol.routes');
app.use('/api/rol', rolRoutes);

const rolPermisoRoutes = require('./routes/rolpermiso.routes');
app.use('/api/rolpermiso', rolPermisoRoutes);

const sedeRoutes = require('./routes/sede.routes');
app.use('/api/sede', sedeRoutes);

const unidadmedidaRoutes = require('./routes/unidadmedida.routes');
app.use('/api/unidadmedida', unidadmedidaRoutes);

const usuariosRoutes = require('./routes/usuarios.routes');
app.use('/api/usuarios', usuariosRoutes);

const ventaRoutes = require('./routes/venta.routes');
app.use('/api/venta', ventaRoutes);

// SOLO para pruebas, puedes borrar luego
app.get('/test-env', (req, res) => {
  res.json({
    DATABASE_URL: process.env.DATABASE_URL ? '✅ OK' : '❌ MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ OK' : '❌ MISSING',
    EMAIL_USER: process.env.EMAIL_USER ? '✅ OK' : '❌ MISSING',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '✅ OK' : '❌ MISSING',
  });
});

module.exports = app;
