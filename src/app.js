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

const estadoventaRoutes = require('./routes/estadoventa.routes');
app.use('/api/estado-venta', estadoventaRoutes); // RUTA CORREGIDA

const historialproduccionRoutes = require('./routes/historialproduccion.routes');
app.use('/api/historial-produccion', historialproduccionRoutes);

const imagenesRoutes = require('./routes/imagenes.routes');
app.use('/api/imagenes', imagenesRoutes);

const insumosRoutes = require('./routes/insumos.routes');
app.use('/api/insumos', insumosRoutes);

const inventarioInsumosRoutes = require('./routes/inventarioInsumos.routes');
app.use('/api/inventario-insumos', inventarioInsumosRoutes);

const pedidoRoutes = require('./routes/pedido.routes');
app.use('/api/pedido', pedidoRoutes);

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
    DATABASE_URL: process.env.DATABASE_URL ? '✅ OK' : '❌ NOT SET'
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});