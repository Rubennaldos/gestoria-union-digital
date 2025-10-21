// Tipos para el módulo de comunicaciones

export interface MensajeMasivo {
  id: string;
  titulo: string;
  descripcion: string;
  imagen?: string;
  link?: string;
  estiloTexto: EstiloTexto;
  activo: boolean;
  fechaCreacion: number;
  fechaInicio?: number;
  fechaFin?: number;
  creadoPor: string;
}

export interface EstiloTexto {
  fuente: string;
  tamano: number;
  color: string;
  negrita: boolean;
  cursiva: boolean;
  alineacion: 'left' | 'center' | 'right';
}

export interface CreateMensajeMasivoForm {
  titulo: string;
  descripcion: string;
  imagen?: string;
  link?: string;
  estiloTexto: EstiloTexto;
  fechaInicio?: number;
  fechaFin?: number;
}

export const FUENTES_DISPONIBLES = [
  { value: 'Inter', label: 'Inter (Por defecto)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegante)' },
  { value: 'Roboto', label: 'Roboto (Moderna)' },
  { value: 'Open Sans', label: 'Open Sans (Limpia)' },
  { value: 'Montserrat', label: 'Montserrat (Audaz)' },
  { value: 'Lora', label: 'Lora (Clásica)' },
  { value: 'Poppins', label: 'Poppins (Amigable)' },
  { value: 'Raleway', label: 'Raleway (Sofisticada)' }
];
