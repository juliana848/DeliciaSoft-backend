// src/services/venta_services.js

const API_BASE_URL = 'https://deliciasoft-backend.onrender.com/api';

class VentaApiService {
  // Transforma los datos de snake_case a camelCase
  transformarVentaDesdeAPI(ventaApi) {
    if (!ventaApi) return null;
    return {
      idVenta: ventaApi.idventa,
      fechaVenta: ventaApi.fechaventa,
      idCliente: ventaApi.cliente,
      idSede: ventaApi.idsede,
      metodoPago: ventaApi.metodopago,
      tipoVenta: ventaApi.tipoventa,
      idEstadoVenta: ventaApi.idestadoventa,
      total: parseFloat(ventaApi.total),
    };
  }

  // Transforma el detalle de venta
  transformarDetalleVentaDesdeAPI(detalleApi) {
    if (!detalleApi) return [];
    return detalleApi.map(item => ({
      iddetalleventa: item.iddetalleventa,
      idventa: item.idventa,
      idproductogeneral: item.idproductogeneral,
      cantidad: item.cantidad,
      precioUnitario: parseFloat(item.preciounitario),
      subtotal: parseFloat(item.subtotal),
      iva: parseFloat(item.iva),
    }));
  }

  // Transforma los abonos
  transformarAbonosDesdeAPI(abonosApi) {
    if (!abonosApi) return [];
    return abonosApi.map(abono => ({
      idAbono: abono.idabono,
      idPedido: abono.idpedido,
      metodoPago: abono.metodopago,
      idImagen: abono.idimagen,
      cantidadPagar: parseFloat(abono.cantidadpagar),
    }));
  }
  
  // N U E V O S    S E R V I C I O S    D E    A P I
  async obtenerClientes() {
    try {
      const response = await fetch(`${API_BASE_URL}/cliente`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener los clientes:', error);
      throw new Error('No se pudo obtener la lista de clientes.');
    }
  }

  async obtenerSedes() {
    try {
      const response = await fetch(`${API_BASE_URL}/sede`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener las sedes:', error);
      throw new Error('No se pudo obtener la lista de sedes.');
    }
  }

  async obtenerProductos() {
    try {
      const response = await fetch(`${API_BASE_URL}/productogeneral`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener los productos:', error);
      throw new Error('No se pudo obtener la lista de productos.');
    }
  }

  async obtenerEstadosVenta() {
    try {
      const response = await fetch(`${API_BASE_URL}/estadoventa`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error al obtener los estados de venta:', error);
      throw new Error('No se pudo obtener la lista de estados de venta.');
    }
  }
  
  // F U N C I O N E S    A C T U A L I Z A D A S
  async obtenerVentas() {
    let estadosVenta = [];
    let clientes = [];
    let sedes = [];

    try {
      [estadosVenta, clientes, sedes] = await Promise.all([
        this.obtenerEstadosVenta(),
        this.obtenerClientes(),
        this.obtenerSedes()
      ]);
    } catch (error) {
      console.error('No se pudieron cargar datos de referencia.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/venta`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      return data.map(venta => {
        const ventaTransformada = this.transformarVentaDesdeAPI(venta);
        const cliente = clientes.find(c => c.idcliente === ventaTransformada.idCliente);
        const sede = sedes.find(s => s.idsede === ventaTransformada.idSede);
        const estado = estadosVenta.find(e => e.idestadoventa === ventaTransformada.idEstadoVenta);

        return {
          ...ventaTransformada,
          nombreCliente: cliente ? cliente.nombre_cliente : `Cliente ${ventaTransformada.idCliente}`,
          nombreSede: sede ? sede.nombre_sede : `Sede ${ventaTransformada.idSede}`,
          nombreEstado: estado ? estado.nombre_estado : 'Desconocido'
        };
      });
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      throw new Error('No se pudo obtener la lista de ventas.');
    }
  }

  async obtenerVentaPorId(id) {
    let estadosVenta = [];
    let clientes = [];
    let sedes = [];
    let productos = [];

    try {
      [estadosVenta, clientes, sedes, productos] = await Promise.all([
        this.obtenerEstadosVenta(),
        this.obtenerClientes(),
        this.obtenerSedes(),
        this.obtenerProductos()
      ]);
    } catch (error) {
      console.error('No se pudieron cargar datos de referencia para el detalle.');
    }

    try {
      const [responseVenta, responseDetalle] = await Promise.all([
        fetch(`${API_BASE_URL}/venta/${id}`),
        fetch(`${API_BASE_URL}/detalleventa?idventa=${id}`),
      ]);

      if (!responseVenta.ok) {
        if (responseVenta.status === 404) {
          throw new Error('Venta no encontrada. El ID de la venta no existe en la base de datos.');
        }
        throw new Error(`HTTP error! Status: ${responseVenta.status}`);
      }

      const ventaData = await responseVenta.json();
      const detalleData = await responseDetalle.json();
      
      // Obtener los abonos por separado, ya que el controlador de venta no los trae directamente
      const responseAbonos = await fetch(`${API_BASE_URL}/abonos?idpedido=${id}`);
      const abonosData = await responseAbonos.json();

      const ventaTransformada = this.transformarVentaDesdeAPI(ventaData);
      const detalleTransformado = this.transformarDetalleVentaDesdeAPI(detalleData);
      const abonosTransformados = this.transformarAbonosDesdeAPI(abonosData);

      const cliente = clientes.find(c => c.idcliente === ventaTransformada.idCliente);
      const sede = sedes.find(s => s.idsede === ventaTransformada.idSede);
      const estado = estadosVenta.find(e => e.idestadoventa === ventaTransformada.idEstadoVenta);

      return {
        ...ventaTransformada,
        nombreCliente: cliente ? cliente.nombre_cliente : `Cliente ${ventaTransformada.idCliente}`,
        nombreSede: sede ? sede.nombre_sede : `Sede ${ventaTransformada.idSede}`,
        nombreEstado: estado ? estado.nombre_estado : 'Desconocido',
        detalleVenta: detalleTransformado.map(item => {
          const producto = productos.find(p => p.idproductogeneral === item.idproductogeneral);
          return {
            ...item,
            nombreProducto: producto ? producto.nombre_producto : `Producto ${item.idproductogeneral}`
          };
        }),
        abonos: abonosTransformados,
      };

    } catch (error) {
      console.error('Error al obtener venta:', error);
      throw new Error(`Error al obtener venta: ${error.message}`);
    }
  }

  async crearVenta(ventaData) {
    try {
      const response = await fetch(`${API_BASE_URL}/venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ventaData),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const nuevaVenta = await response.json();
      return this.transformarVentaDesdeAPI(nuevaVenta);
    } catch (error) {
      console.error('Error al crear venta:', error);
      throw new Error('No se pudo crear la venta.');
    }
  }

  async anularVenta(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/venta/${id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idestadoventa: 2 }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al anular la venta:', error);
        throw new Error('No se pudo anular la venta.');
    }
  }

  async actualizarEstadoVenta(idVenta, nuevoEstadoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/venta/${idVenta}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idestadoventa: nuevoEstadoId }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al actualizar el estado de la venta:', error);
        throw new Error('No se pudo actualizar el estado de la venta.');
    }
  }

  async agregarAbono(abonoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/abonos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(abonoData),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error al agregar abono:', error);
      throw new Error('No se pudo agregar el abono.');
    }
  }
}

const ventaApiService = new VentaApiService();
export default ventaApiService;