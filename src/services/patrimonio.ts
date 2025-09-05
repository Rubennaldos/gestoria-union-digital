import { ItemPatrimonio, ResumenPatrimonio, FiltrosPatrimonio } from '@/types/patrimonio';

// Simulamos datos para el desarrollo
let items: ItemPatrimonio[] = [
  {
    id: '1',
    codigo: 'PAT-001',
    codigoBarras: '1234567890001',
    nombre: 'Extintor ABC 6kg',
    descripcion: 'Extintor de polvo ABC, marca Matafuegos SA, modelo MF-6ABC, capacidad 6kg',
    ubicacion: {
      zona: 'Hall de ingreso',
      referenciaInterna: 'EXT-HALL-01'
    },
    cantidad: 2,
    estado: {
      conservacion: 'bueno',
      condicion: 'nuevo',
      observaciones: 'Recién instalado, próximo vencimiento 2026'
    },
    fechaAdquisicion: {
      fecha: '2024-01-15',
      comprador: 'Ana García - Administradora'
    },
    valorEstimado: 25000,
    responsable: 'Juan Pérez - Encargado de Seguridad',
    mantenimiento: {
      requiere: true,
      encargado: 'Empresa Matafuegos SA',
      proximaFecha: '2025-01-15'
    },
    documentacion: {
      tipoDocumento: 'factura',
      numeroDocumento: 'FAC-001-2024',
      archivos: []
    },
    donacion: {
      esDonacion: false
    },
    observaciones: 'Ubicados según normas de seguridad contra incendios',
    fechaCreacion: '2024-01-15T10:00:00',
    fechaActualizacion: '2024-01-15T10:00:00',
    activo: true
  },
  {
    id: '2',
    codigo: 'PAT-002',
    codigoBarras: '1234567890002',
    nombre: 'Mueble de recepción',
    descripcion: 'Escritorio de recepción en L, melamina blanca, 1.60m x 1.20m',
    ubicacion: {
      zona: 'Recepción principal',
      referenciaInterna: 'MUE-REC-01'
    },
    cantidad: 1,
    estado: {
      conservacion: 'regular',
      condicion: 'segunda',
      observaciones: 'Tiene algunas marcas de uso, necesita retoque de pintura'
    },
    fechaAdquisicion: {
      fecha: '2023-08-20',
      comprador: 'Carlos Mendoza - Consejero'
    },
    valorEstimado: 45000,
    responsable: 'María López - Recepcionista',
    mantenimiento: {
      requiere: false
    },
    documentacion: {
      tipoDocumento: 'boleta',
      numeroDocumento: 'BOL-145-2023'
    },
    donacion: {
      esDonacion: true,
      valorAproximado: 30000,
      donante: 'Familia Rodríguez'
    },
    observaciones: 'Donación de propietario que se mudó',
    fechaCreacion: '2023-08-20T14:30:00',
    fechaActualizacion: '2024-01-10T09:15:00',
    activo: true
  }
];

let proximoCorrelativo = 3;

// Generar código correlativo
const generarCodigoCorrelativo = (): string => {
  const codigo = `PAT-${proximoCorrelativo.toString().padStart(3, '0')}`;
  proximoCorrelativo++;
  return codigo;
};

// Generar código de barras (13 dígitos)
const generarCodigoBarras = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `1234567${timestamp.slice(-6)}`;
};

// Obtener todos los items con filtros
export const obtenerItems = async (filtros?: FiltrosPatrimonio): Promise<ItemPatrimonio[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay

  let itemsFiltrados = [...items].filter(item => item.activo);

  if (filtros) {
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      itemsFiltrados = itemsFiltrados.filter(item =>
        item.nombre.toLowerCase().includes(busqueda) ||
        item.descripcion.toLowerCase().includes(busqueda) ||
        item.codigo.toLowerCase().includes(busqueda) ||
        item.ubicacion.zona.toLowerCase().includes(busqueda)
      );
    }

    if (filtros.estado && filtros.estado !== 'todos') {
      itemsFiltrados = itemsFiltrados.filter(item => item.estado.conservacion === filtros.estado);
    }

    if (filtros.condicion && filtros.condicion !== 'todos') {
      itemsFiltrados = itemsFiltrados.filter(item => item.estado.condicion === filtros.condicion);
    }

    if (filtros.ubicacion) {
      itemsFiltrados = itemsFiltrados.filter(item =>
        item.ubicacion.zona.toLowerCase().includes(filtros.ubicacion!.toLowerCase())
      );
    }

    if (filtros.responsable) {
      itemsFiltrados = itemsFiltrados.filter(item =>
        item.responsable.toLowerCase().includes(filtros.responsable!.toLowerCase())
      );
    }

    if (filtros.esDonacion !== undefined) {
      itemsFiltrados = itemsFiltrados.filter(item => item.donacion.esDonacion === filtros.esDonacion);
    }

    if (filtros.requiereMantenimiento !== undefined) {
      itemsFiltrados = itemsFiltrados.filter(item => item.mantenimiento.requiere === filtros.requiereMantenimiento);
    }
  }

  return itemsFiltrados.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
};

// Obtener item por ID
export const obtenerItemPorId = async (id: string): Promise<ItemPatrimonio | null> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return items.find(item => item.id === id) || null;
};

// Crear nuevo item
export const crearItem = async (datos: Omit<ItemPatrimonio, 'id' | 'codigo' | 'codigoBarras' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<ItemPatrimonio> => {
  await new Promise(resolve => setTimeout(resolve, 500));

  const nuevoItem: ItemPatrimonio = {
    ...datos,
    id: Date.now().toString(),
    codigo: generarCodigoCorrelativo(),
    codigoBarras: generarCodigoBarras(),
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };

  items.push(nuevoItem);
  return nuevoItem;
};

// Actualizar item
export const actualizarItem = async (id: string, datos: Partial<ItemPatrimonio>): Promise<ItemPatrimonio> => {
  await new Promise(resolve => setTimeout(resolve, 400));

  const index = items.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error('Item no encontrado');
  }

  items[index] = {
    ...items[index],
    ...datos,
    fechaActualizacion: new Date().toISOString(),
  };

  return items[index];
};

// Eliminar item (soft delete)
export const eliminarItem = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  const index = items.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error('Item no encontrado');
  }

  items[index].activo = false;
  items[index].fechaActualizacion = new Date().toISOString();
};

// Obtener resumen del patrimonio
export const obtenerResumenPatrimonio = async (): Promise<ResumenPatrimonio> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  const itemsActivos = items.filter(item => item.activo);

  const resumen: ResumenPatrimonio = {
    totalItems: itemsActivos.length,
    valorTotalPatrimonio: itemsActivos.reduce((total, item) => {
      return total + (item.donacion.esDonacion ? (item.donacion.valorAproximado || 0) : item.valorEstimado);
    }, 0),
    itemsPorEstado: {
      bueno: itemsActivos.filter(item => item.estado.conservacion === 'bueno').length,
      regular: itemsActivos.filter(item => item.estado.conservacion === 'regular').length,
      malo: itemsActivos.filter(item => item.estado.conservacion === 'malo').length,
    },
    itemsPorCondicion: {
      nuevo: itemsActivos.filter(item => item.estado.condicion === 'nuevo').length,
      segunda: itemsActivos.filter(item => item.estado.condicion === 'segunda').length,
    },
    donaciones: {
      cantidad: itemsActivos.filter(item => item.donacion.esDonacion).length,
      valorTotal: itemsActivos
        .filter(item => item.donacion.esDonacion)
        .reduce((total, item) => total + (item.donacion.valorAproximado || 0), 0),
    },
    mantenimiento: {
      pendientes: itemsActivos.filter(item => item.mantenimiento.requiere).length,
      alDia: itemsActivos.filter(item => !item.mantenimiento.requiere).length,
    },
  };

  return resumen;
};