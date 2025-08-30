import { 
  Sancion, 
  CreateSancionForm, 
  UpdateSancionForm, 
  SancionesStats, 
  SancionFilters,
  TipoEntidad,
  EmpadronadoSancionable,
  MaestroObraSancionable,
  DireccionSancionable,
  VehiculoSancionable,
  NegocioSancionable,
  DelegadoSancionable,
  JuntaDirectivaSancionable
} from '@/types/sanciones';
import { db } from '@/config/firebase';
import { ref, push, set, get, update, remove, query, orderByChild } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Simulación de datos para desarrollo
let sanciones: Sancion[] = [
  {
    id: '1',
    numeroSancion: 'SAN-2024-001',
    tipoEntidad: 'empadronado',
    entidadId: 'emp-1',
    entidadNombre: 'Juan Pérez García',
    entidadDocumento: '12345678',
    tipoSancion: 'multa',
    motivo: 'Incumplimiento de estatutos',
    descripcion: 'No cumplimiento de horarios de construcción establecidos',
    montoMulta: 150.00,
    fechaAplicacion: '2024-01-15',
    fechaVencimiento: '2024-02-15',
    estado: 'activa',
    aplicadoPor: 'fiscal-1',
    aplicadoPorNombre: 'María González',
    resolucion: 'RES-001-2024',
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 30
  },
  {
    id: '2',
    numeroSancion: 'SAN-2024-002',
    tipoEntidad: 'vehiculo',
    entidadId: 'veh-1',
    entidadNombre: 'Vehículo ABC-123',
    entidadDocumento: 'ABC-123',
    tipoSancion: 'amonestacion',
    motivo: 'Estacionamiento indebido',
    descripcion: 'Vehículo estacionado en área común',
    fechaAplicacion: '2024-01-20',
    estado: 'cumplida',
    aplicadoPor: 'fiscal-1',
    aplicadoPorNombre: 'María González',
    fechaCumplimiento: '2024-01-25',
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 20
  }
];

let entidadesSancionables = {
  empadronados: [
    {
      id: 'emp-1',
      nombre: 'Juan',
      apellidos: 'Pérez García',
      dni: '12345678',
      numeroPadron: 'P-001',
      manzana: 'A',
      lote: '01',
      etapa: 'I'
    },
    {
      id: 'emp-2',
      nombre: 'Ana',
      apellidos: 'López Silva',
      dni: '87654321',
      numeroPadron: 'P-002',
      manzana: 'B',
      lote: '05',
      etapa: 'II'
    }
  ] as EmpadronadoSancionable[],
  
  maestrosObra: [
    {
      id: 'mo-1',
      nombre: 'Carlos',
      apellidos: 'Ramírez Torres',
      dni: '11223344',
      licencia: 'LIC-001',
      telefono: '987654321'
    }
  ] as MaestroObraSancionable[],
  
  direcciones: [
    {
      id: 'dir-1',
      nombre: 'Roberto',
      apellidos: 'Fernández Vega',
      dni: '55667788',
      cargo: 'Presidente',
      periodo: '2024-2026'
    }
  ] as DireccionSancionable[],
  
  vehiculos: [
    {
      id: 'veh-1',
      placa: 'ABC-123',
      tipo: 'vehiculo' as const,
      propietario: 'Juan Pérez García',
      propietarioDni: '12345678'
    }
  ] as VehiculoSancionable[],
  
  negocios: [
    {
      id: 'neg-1',
      nombre: 'Bodega San José',
      ruc: '20123456789',
      propietario: 'José Martínez',
      propietarioDni: '99887766',
      direccion: 'Mza. C Lote 10'
    }
  ] as NegocioSancionable[],
  
  delegados: [
    {
      id: 'del-1',
      nombre: 'Patricia',
      apellidos: 'Rojas Medina',
      dni: '44556677',
      etapaAsignada: 'Etapa I',
      telefono: '912345678'
    }
  ] as DelegadoSancionable[],
  
  juntaDirectiva: [
    {
      id: 'jd-1',
      nombre: 'Roberto',
      apellidos: 'Fernández Vega',
      dni: '55667788',
      cargo: 'Presidente',
      periodo: '2024-2026'
    }
  ] as JuntaDirectivaSancionable[]
};

export const getSanciones = async (filters?: SancionFilters): Promise<Sancion[]> => {
  try {
    const sancionesRef = ref(db, 'sanciones');
    const snapshot = await get(sancionesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const sancionesData = snapshot.val();
    let result: Sancion[] = Object.keys(sancionesData).map(key => ({
      id: key,
      ...sancionesData[key]
    }));
    
    if (filters) {
      if (filters.tipoEntidad) {
        result = result.filter(s => s.tipoEntidad === filters.tipoEntidad);
      }
      if (filters.tipoSancion) {
        result = result.filter(s => s.tipoSancion === filters.tipoSancion);
      }
      if (filters.estado) {
        result = result.filter(s => s.estado === filters.estado);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(s => 
          s.entidadNombre.toLowerCase().includes(search) ||
          s.motivo.toLowerCase().includes(search) ||
          s.numeroSancion.toLowerCase().includes(search)
        );
      }
    }
    
    return result.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting sanciones:', error);
    throw error;
  }
};

export const getSancionById = async (id: string): Promise<Sancion | null> => {
  try {
    const sancionRef = ref(db, `sanciones/${id}`);
    const snapshot = await get(sancionRef);
    
    if (snapshot.exists()) {
      return { id, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error getting sancion:', error);
    throw error;
  }
};

export const createSancion = async (data: CreateSancionForm, archivoDocumento?: File): Promise<Sancion> => {
  try {
    // Generar número de sanción
    const sancionesRef = ref(db, 'sanciones');
    const snapshot = await get(sancionesRef);
    const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
    const numeroSancion = `SAN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    
    let documentoSancionUrl = undefined;
    
    // Subir archivo si existe
    if (archivoDocumento) {
      const storage = getStorage();
      const fileName = `sanciones/${Date.now()}_${archivoDocumento.name}`;
      const fileRef = storageRef(storage, fileName);
      await uploadBytes(fileRef, archivoDocumento);
      documentoSancionUrl = await getDownloadURL(fileRef);
    }
    
    const newSancion: Omit<Sancion, 'id'> = {
      numeroSancion,
      ...data,
      fechaAplicacion: new Date().toISOString().split('T')[0],
      estado: 'activa',
      aplicadoPor: 'current-user-id', // En producción sería el ID del usuario actual
      aplicadoPorNombre: 'Usuario Actual', // En producción sería el nombre del usuario actual
      documentoSancion: documentoSancionUrl,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const newRef = push(sancionesRef);
    await set(newRef, newSancion);
    
    return { id: newRef.key!, ...newSancion };
  } catch (error) {
    console.error('Error creating sancion:', error);
    throw error;
  }
};

export const updateSancion = async (id: string, data: UpdateSancionForm): Promise<Sancion> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const index = sanciones.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error('Sanción no encontrada');
  }
  
  sanciones[index] = {
    ...sanciones[index],
    ...data,
    updatedAt: Date.now()
  };
  
  return sanciones[index];
};

export const deleteSancion = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const index = sanciones.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error('Sanción no encontrada');
  }
  
  sanciones.splice(index, 1);
};

export const getSancionesStats = async (): Promise<SancionesStats> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const stats: SancionesStats = {
    total: sanciones.length,
    activas: sanciones.filter(s => s.estado === 'activa').length,
    cumplidas: sanciones.filter(s => s.estado === 'cumplida').length,
    anuladas: sanciones.filter(s => s.estado === 'anulada').length,
    enProceso: sanciones.filter(s => s.estado === 'en_proceso').length,
    porTipoEntidad: {
      empadronado: sanciones.filter(s => s.tipoEntidad === 'empadronado').length,
      maestro_obra: sanciones.filter(s => s.tipoEntidad === 'maestro_obra').length,
      direccion: sanciones.filter(s => s.tipoEntidad === 'direccion').length,
      vehiculo: sanciones.filter(s => s.tipoEntidad === 'vehiculo').length,
      negocio: sanciones.filter(s => s.tipoEntidad === 'negocio').length,
      delegado: sanciones.filter(s => s.tipoEntidad === 'delegado').length,
      junta_directiva: sanciones.filter(s => s.tipoEntidad === 'junta_directiva').length,
    },
    montoTotalMultas: sanciones.reduce((sum, s) => sum + (s.montoMulta || 0), 0),
    montoMultasPendientes: sanciones
      .filter(s => s.estado === 'activa' && s.montoMulta)
      .reduce((sum, s) => sum + (s.montoMulta || 0), 0)
  };
  
  return stats;
};

export const getEntidadesSancionables = async (tipoEntidad: TipoEntidad) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  switch (tipoEntidad) {
    case 'empadronado':
      return entidadesSancionables.empadronados;
    case 'maestro_obra':
      return entidadesSancionables.maestrosObra;
    case 'direccion':
      return entidadesSancionables.direcciones;
    case 'vehiculo':
      return entidadesSancionables.vehiculos;
    case 'negocio':
      return entidadesSancionables.negocios;
    case 'delegado':
      return entidadesSancionables.delegados;
    case 'junta_directiva':
      return entidadesSancionables.juntaDirectiva;
    default:
      return [];
  }
};