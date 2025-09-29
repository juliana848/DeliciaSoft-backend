const BASE_URL = "https://deliciasoft-backend-i6g9.onrender.com/api/compra";

class CompraApiService {
  constructor() {
    this.baseHeaders = { "Content-Type": "application/json" };
  }

  async handleResponse(response) {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // MÉTODO SIMPLIFICADO PARA CAMBIAR ESTADO - USANDO ENDPOINTS ESPECÍFICOS
  async cambiarEstadoCompra(id, nuevoEstado) {
    try {
      console.log(`=== INICIANDO CAMBIO DE ESTADO ===`);
      console.log('ID de compra:', id);
      console.log('Nuevo estado:', nuevoEstado);
      
      // Determinar el endpoint correcto según el estado
      const endpoint = nuevoEstado ? 'activar' : 'anular';
      const url = `${BASE_URL}/${id}/${endpoint}`;
      
      console.log('📡 URL del endpoint:', url);

      // Llamada directa al endpoint específico
      const response = await fetch(url, {
        method: "PUT",
        headers: this.baseHeaders,
        // No necesitamos body, el endpoint maneja todo internamente
      });

      console.log('📡 Respuesta del servidor - Status:', response.status);
      console.log('📡 Respuesta del servidor - StatusText:', response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const resultado = await response.json();
      console.log('✅ Respuesta completa del servidor:', resultado);

      // El controlador devuelve { message: "...", compra: {...} }
      const compraActualizada = resultado.compra || resultado;
      console.log('🔄 Compra actualizada:', compraActualizada);

      // Transformar y retornar
      return this.transformarCompraDesdeAPI(compraActualizada);

    } catch (error) {
      console.error('❌ ERROR EN cambiarEstadoCompra:', error);
      throw new Error(`No se pudo ${nuevoEstado ? 'reactivar' : 'anular'} la compra: ${error.message}`);
    }
  }

  // MÉTODO AUXILIAR: Formatear fechas para backend
  formatearFechaParaBackend(fecha) {
    if (!fecha) return new Date().toISOString().split('T')[0];
    
    // Si ya es string con formato YYYY-MM-DD, devolver tal cual
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }
    
    // Si es objeto Date o string con otra formato, convertir
    return new Date(fecha).toISOString().split('T')[0];
  }

  // MÉTODO AUXILIAR: Preparar detalles para backend
  prepararDetallesParaBackend(detalles) {
    if (!Array.isArray(detalles)) {
      console.warn('⚠️ Detalles no es array:', detalles);
      return [];
    }

    return detalles.map(detalle => {
      const resultado = {
        idinsumos: detalle.idInsumo || detalle.idinsumo || detalle.id,
        cantidad: parseInt(detalle.cantidad) || 0,
        preciounitario: parseFloat(detalle.precioUnitario || detalle.precio) || 0,
        subtotalproducto: parseFloat(detalle.subtotalProducto) || 
                         (parseInt(detalle.cantidad || 0) * parseFloat(detalle.precioUnitario || detalle.precio || 0))
      };
      
      console.log('🔧 Detalle transformado:', {
        original: detalle,
        transformado: resultado
      });
      
      return resultado;
    });
  }

  // MÉTODOS EXISTENTES - NO CAMBIAR
  async obtenerCompras() {
    try {
      console.log('📡 Obteniendo compras desde:', BASE_URL);
      const response = await fetch(`${BASE_URL}`, {
        method: "GET",
        headers: this.baseHeaders,
      });
      const data = await this.handleResponse(response);
      console.log('📋 Datos crudos de la API:', data);
      const comprasTransformadas = this.transformarComprasDesdeAPI(data);
      console.log('🔄 Compras transformadas:', comprasTransformadas);
      return comprasTransformadas;
    } catch (error) {
      console.error('❌ Error en obtenerCompras:', error);
      throw error;
    }
  }

  async obtenerCompraPorId(id) {
    try {
      console.log('📡 Obteniendo compra por ID:', id);
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: "GET",
        headers: this.baseHeaders,
      });
      if (response.status === 404) throw new Error("Compra no encontrada");
      const data = await this.handleResponse(response);
      console.log('📋 Compra obtenida:', data);
      return this.transformarCompraDesdeAPI(data);
    } catch (error) {
      console.error('❌ Error en obtenerCompraPorId:', error);
      throw error;
    }
  }

  async crearCompra(compraData) {
    try {
      const compraAPI = this.transformarCompraParaAPI(compraData);
      this.validarDatosCompra(compraAPI);

      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: this.baseHeaders,
        body: JSON.stringify(compraAPI),
      });

      const data = await this.handleResponse(response);
      return this.transformarCompraDesdeAPI(data);
    } catch (error) {
      console.error('Error en crearCompra:', error);
      throw error;
    }
  }

  async actualizarCompra(id, compraData) {
    try {
      const compraAPI = this.transformarCompraParaAPI(compraData);
      this.validarDatosCompra(compraAPI);

      const response = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: this.baseHeaders,
        body: JSON.stringify(compraAPI),
      });

      const data = await this.handleResponse(response);
      return this.transformarCompraDesdeAPI(data);
    } catch (error) {
      console.error('Error en actualizarCompra:', error);
      throw error;
    }
  }

  async eliminarCompra(id) {
    try {
      const response = await fetch(`${BASE_URL}/${id}`, {
        method: "DELETE",
        headers: this.baseHeaders,
      });
      await this.handleResponse(response);
      return { success: true, message: "Compra eliminada exitosamente" };
    } catch (error) {
      console.error('Error en eliminarCompra:', error);
      throw error;
    }
  }

  // Métodos para DETALLES DE COMPRA
  async obtenerDetallesCompra(idCompra) {
    try {
      const response = await fetch(`${BASE_URL}/${idCompra}/detalles`, {
        method: "GET",
        headers: this.baseHeaders,
      });
      const data = await this.handleResponse(response);
      return this.transformarDetallesCompraDesdeAPI(data);
    } catch (error) {
      console.error('Error en obtenerDetallesCompra:', error);
      throw error;
    }
  }

  // Métodos de utilidad para reportes
  async obtenerComprasPorRangoFechas(fechaInicio, fechaFin) {
    try {
      const params = new URLSearchParams({
        fechaInicio: fechaInicio,
        fechaFin: fechaFin
      });
      
      const response = await fetch(`${BASE_URL}/reporte?${params}`, {
        method: "GET",
        headers: this.baseHeaders,
      });
      const data = await this.handleResponse(response);
      return this.transformarComprasDesdeAPI(data);
    } catch (error) {
      console.error('Error en obtenerComprasPorRangoFechas:', error);
      throw error;
    }
  }

  async obtenerComprasPorProveedor(idProveedor) {
    try {
      const response = await fetch(`${BASE_URL}/proveedor/${idProveedor}`, {
        method: "GET",
        headers: this.baseHeaders,
      });
      const data = await this.handleResponse(response);
      return this.transformarComprasDesdeAPI(data);
    } catch (error) {
      console.error('Error en obtenerComprasPorProveedor:', error);
      throw error;
    }
  }

  // Validaciones
  validarDatosCompra(compra) {
    const errores = [];
    
    if (!compra.idproveedor) errores.push("El proveedor es requerido");
    if (!compra.fechacompra) errores.push("La fecha de compra es requerida");
    if (!compra.subtotal || compra.subtotal <= 0) errores.push("El subtotal debe ser mayor a 0");
    if (!compra.total || compra.total <= 0) errores.push("El total debe ser mayor a 0");

    if (errores.length > 0) {
      throw new Error("Datos inválidos: " + errores.join(", "));
    }
  }

  validarDatosDetalleCompra(detalle) {
    const errores = [];
    
    if (!detalle.idinsumos) errores.push("El insumo es requerido");
    if (!detalle.cantidad || detalle.cantidad <= 0) errores.push("La cantidad debe ser mayor a 0");
    if (!detalle.preciounitario || detalle.preciounitario <= 0) errores.push("El precio unitario debe ser mayor a 0");

    if (errores.length > 0) {
      throw new Error("Datos inválidos: " + errores.join(", "));
    }
  }

  // Transformaciones COMPRA - CORREGIDAS
  transformarCompraParaAPI(compra) {
    return {
      idproveedor: compra.idProveedor,
      fecharegistro: compra.fechaRegistro || new Date().toISOString().split('T')[0],
      fechacompra: compra.fechaCompra,
      subtotal: parseFloat(compra.subtotal) || 0,
      iva: parseFloat(compra.iva) || 0,
      total: parseFloat(compra.total) || 0,
      observaciones: compra.observaciones || '',
      estado: compra.estado !== undefined ? compra.estado : true,
      detallecompra: compra.detalles ? compra.detalles.map(d => this.transformarDetalleCompraParaAPI(d)) : []
    };
  }

  transformarCompraDesdeAPI(compra) {
    if (!compra) return null;
    
    console.log('🔄 Transformando compra desde API:', compra);
    
    const resultado = {
      id: compra.idcompra || compra.id,
      idcompra: compra.idcompra || compra.id, // Mantener ambos para compatibilidad
      idProveedor: compra.idproveedor || compra.idProveedor,
      fechaRegistro: compra.fecharegistro || compra.fechaRegistro,
      fechaCompra: compra.fechacompra || compra.fechaCompra,
      fechacompra: compra.fechacompra || compra.fechaCompra, // Mantener ambos
      subtotal: parseFloat(compra.subtotal) || 0,
      iva: parseFloat(compra.iva) || 0,
      total: parseFloat(compra.total) || 0,
      estado: compra.estado !== undefined ? compra.estado : true,
      observaciones: compra.observaciones || '',
      proveedor: this.transformarProveedorDesdeAPI(compra.proveedor || compra.Proveedor),
      detalles: this.transformarDetallesCompraDesdeAPI(compra.detallecompra || compra.detalles || compra.DetalleCompras || [])
    };
    
    console.log('✅ Compra transformada:', resultado);
    return resultado;
  }

  transformarProveedorDesdeAPI(proveedor) {
    if (!proveedor) return null;
    
    return {
      id: proveedor.idproveedor || proveedor.id,
      idproveedor: proveedor.idproveedor || proveedor.id, // Mantener ambos
      nombre: proveedor.nombreproveedor || 
              proveedor.nombre || 
              proveedor.nombreempresa ||
              proveedor.nombreCategoria || 
              proveedor.nombre_proveedor,
      nombreproveedor: proveedor.nombreproveedor || proveedor.nombre, // Mantener ambos
      nombreempresa: proveedor.nombreempresa
    };
  }

  transformarComprasDesdeAPI(compras) {
    if (!Array.isArray(compras)) {
      console.warn('⚠️ Las compras no son un array:', compras);
      return [];
    }
    return compras.map((c) => this.transformarCompraDesdeAPI(c));
  }

  // Transformaciones DETALLE COMPRA
  transformarDetalleCompraParaAPI(detalle) {
    return {
      idinsumos: detalle.idinsumos ?? detalle.idinsumo ?? detalle.idInsumo ?? detalle.id,
      cantidad: detalle.cantidad,
      preciounitario: detalle.preciounitario ?? detalle.precioUnitario,
      subtotalproducto: detalle.subtotalproducto ?? detalle.subtotalProducto
    };
  }

  transformarDetalleCompraDesdeAPI(detalle) {
    if (!detalle) return null;

    if (!detalle.idinsumos && !detalle.idInsumo) {
      console.warn("⚠️ Detalle sin idInsumo:", detalle);
    }

    return {
      id: detalle.iddetallecompra || detalle.id,
      idCompra: detalle.idcompra || detalle.idCompra,
      idInsumo: detalle.idinsumos || detalle.idInsumo || null,
      cantidad: parseFloat(detalle.cantidad) || 0,
      precioUnitario: parseFloat(detalle.preciounitario || detalle.precioUnitario) || 0,
      subtotalProducto: parseFloat(detalle.subtotalproducto || detalle.subtotalProducto) || 0,
      insumo: detalle.insumos || detalle.insumo ? {
        id: (detalle.insumos || detalle.insumo).idinsumo || (detalle.insumos || detalle.insumo).id,
        nombre: (detalle.insumos || detalle.insumo).nombreinsumo || (detalle.insumos || detalle.insumo).nombre,
        unidad: (detalle.insumos || detalle.insumo).unidad || 'N/A'
      } : null
    };
  }

  transformarDetallesCompraDesdeAPI(detalles) {
    if (!Array.isArray(detalles)) return [];
    return detalles.map((d) => this.transformarDetalleCompraDesdeAPI(d));
  }

  // Métodos de cálculo
  calcularSubtotalDetalle(cantidad, precioUnitario) {
    return parseFloat(cantidad) * parseFloat(precioUnitario);
  }

  calcularTotalesCompra(detalles, porcentajeIva = 19) {
    const subtotal = detalles.reduce((sum, detalle) => {
      return sum + (parseFloat(detalle.subtotalProducto) || 0);
    }, 0);
    
    const iva = (subtotal * porcentajeIva) / 100;
    const total = subtotal + iva;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      iva: parseFloat(iva.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }
}

const compraApiService = new CompraApiService();
export default compraApiService;