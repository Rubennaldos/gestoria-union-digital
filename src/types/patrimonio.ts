export interface ItemPatrimonio {
  id: string;
  codigo: string; // Código correlativo automático
  codigoBarras: string; // Código de barras generado automáticamente
  nombre: string; // Nombre del objeto o equipo
  descripcion: string; // Descripción técnica (marca, modelo, características)
  ubicacion: {
    zona: string; // Zona común donde se encuentra
    referenciaInterna?: string; // Código o referencia interna si aplica
  };
  cantidad: number; // Número de unidades por tipo de bien
  estado: {
    conservacion: 'bueno' | 'regular' | 'malo'; // Estado de conservación
    condicion: 'nuevo' | 'segunda'; // Si es nuevo o de segunda
    observaciones?: string; // Observaciones sobre desgaste, mantenimiento, etc.
  };
  fechaAdquisicion: {
    fecha: string; // Año y mes en que se compró o recibió
    comprador: string; // Quien lo compró
  };
  valorEstimado: number; // Costo de adquisición o valor actual aproximado
  responsable: string; // Persona o cargo encargado de su mantenimiento o supervisión
  mantenimiento: {
    requiere: boolean; // Si requiere mantenimiento o no
    encargado?: string; // Quien es el encargado del mantenimiento
    ultimaFecha?: string; // Última fecha de mantenimiento
    proximaFecha?: string; // Próxima fecha de mantenimiento
  };
  documentacion: {
    tipoDocumento?: 'factura' | 'boleta' | 'contrato' | 'garantia' | 'otro';
    numeroDocumento?: string;
    archivos?: string[]; // URLs de archivos adjuntos
    fotos?: string[]; // URLs de fotos
  };
  donacion: {
    esDonacion: boolean; // Si es una donación
    valorAproximado?: number; // Valor aproximado si es donación
    donante?: string; // Quien hizo la donación
  };
  observaciones?: string; // Notas sobre reparaciones, traslados, pérdidas o donaciones
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
}

export interface ResumenPatrimonio {
  totalItems: number;
  valorTotalPatrimonio: number;
  itemsPorEstado: {
    bueno: number;
    regular: number;
    malo: number;
  };
  itemsPorCondicion: {
    nuevo: number;
    segunda: number;
  };
  donaciones: {
    cantidad: number;
    valorTotal: number;
  };
  mantenimiento: {
    pendientes: number;
    alDia: number;
  };
}

export interface FiltrosPatrimonio {
  busqueda?: string;
  estado?: 'bueno' | 'regular' | 'malo' | 'todos';
  condicion?: 'nuevo' | 'segunda' | 'todos';
  ubicacion?: string;
  responsable?: string;
  esDonacion?: boolean;
  requiereMantenimiento?: boolean;
}

export type TipoVistaPatrimonio = 'lista' | 'tarjetas' | 'tabla';