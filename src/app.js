const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API DeliciaSoft funcionando 🚀');
});

// Importar rutas
const clienteRoutes = require('./routes/cliente.routes');
app.use('/api/clientes', clienteRoutes);

const compraRoutes = require('./routes/compra.routes');
app.use('/api/compra', compraRoutes);

// CORRECCIÓN: Cambiar la ruta base de abonos
const abonoRoutes = require('./routes/abonos.routes'); 
app.use('/api/abonos', abonoRoutes); // Cambiar de '/api/abono' a '/api/abonos'

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const catalogoAdicionesRoutes = require('./routes/catalogoAdiciones.routes');
app.use('/api/catalogo-adiciones', catalogoAdicionesRoutes);

const catalogoRellenoRoutes = require('./routes/catalogoRelleno.routes');
app.use('/api/catalogo-relleno', catalogoRellenoRoutes);

const catalogoSaborRoutes = require('./routes/catalogoSabor.routes');
app.use('/api/catalogo-sabor', catalogoSaborRoutes);

const catalogoSaborRoutes = require('./routes/catalogoSalsas.routes');
app.use('/api/catalogo-salsas', catalogoSalsasRoutes);

const categoriaInsumosRoutes = require('./routes/categoriaInsumos.routes');
app.use('/api/categoria-insumos', categoriaInsumosRoutes);

const categoriaProductosRoutes = require('./routes/categoriaProducto.routes');
app.use('/api/categorias-productos', categoriaProductosRoutes);

const estadoventaRoutes = require('./routes/estadoventa.routes');
app.use('/api/estado-venta', estadoventaRoutes); 

const insumosRoutes = require('./routes/insumos.routes');
app.use('/api/insumos', insumosRoutes);

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

const permisosRoutes = require('./routes/permisos.routes');
app.use('/api/permisos', permisosRoutes);

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

const imagenesRoutes = require('./routes/imagenes.routes');
app.use('/api/imagenes', imagenesRoutes);


const contactoRoutes = require('./routes/contacto.routes');
app.use('/api/contacto', contactoRoutes);

const inventarioSedeRoutes = require('./routes/inventariosede.routes');
app.use('/api/inventariosede', inventarioSedeRoutes);

const configuracionProductoRoutes = require('./routes/configuracionproducto.routes');
app.use('/api/configuracion-producto', configuracionProductoRoutes);

// SOLO para pruebas, puedes borrar luego
app.get('/test-env', (req, res) => {
  res.json({
    DATABASE_URL: process.env.DATABASE_URL ? '✅ OK' : '❌ NOT SET'
  });
});

module.exports = app;