import { ref, push, set, update, remove, query, orderByChild, equalTo, get } from 'firebase/database';
import { db } from '@/config/firebase';
import { Empadronado, CreateEmpadronadoForm, UpdateEmpadronadoForm, EmpadronadosStats } from '@/types/empadronados';
import { writeAuditLog } from './rtdb';

const EMPADRONADOS_PATH = 'empadronados';

// Función para eliminar valores undefined de un objeto recursivamente
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const cleanObj: any = {};
    Object.keys(obj).forEach(key => {
      const value = removeUndefined(obj[key]);
      if (value !== undefined) {
        cleanObj[key] = value;
      }
    });
    return cleanObj;
  }
  
  return obj;
};

// Crear nuevo empadronado
export const createEmpadronado = async (
  data: CreateEmpadronadoForm, 
  actorUid: string
): Promise<string | null> => {
  try {
    const empadronadoRef = push(ref(db, EMPADRONADOS_PATH));
    const id = empadronadoRef.key!;
    
    const empadronado: Empadronado = {
      ...data,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creadoPor: actorUid
    };

    // Eliminar todos los valores undefined antes de enviar a Firebase
    const cleanData = removeUndefined(empadronado);

    await set(empadronadoRef, cleanData);
    
    await writeAuditLog({
      actorUid,
      accion: 'crear_empadronado',
      moduloId: 'empadronados',
      new: empadronado
    });

    return id;
  } catch (error) {
    console.error('Error creating empadronado:', error);
    return null;
  }
};

// Obtener todos los empadronados
export const getEmpadronados = async (): Promise<Empadronado[]> => {
  try {
    const snapshot = await get(ref(db, EMPADRONADOS_PATH));
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    return Object.values(data) as Empadronado[];
  } catch (error) {
    console.error('Error getting empadronados:', error);
    return [];
  }
};

// Obtener empadronado por ID
export const getEmpadronado = async (id: string): Promise<Empadronado | null> => {
  try {
    const snapshot = await get(ref(db, `${EMPADRONADOS_PATH}/${id}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting empadronado:', error);
    return null;
  }
};

// Actualizar empadronado
export const updateEmpadronado = async (
  id: string, 
  updates: UpdateEmpadronadoForm, 
  actorUid: string
): Promise<boolean> => {
  try {
    const oldData = await getEmpadronado(id);
    if (!oldData) return false;

    const updateData = {
      ...updates,
      updatedAt: Date.now(),
      modificadoPor: actorUid
    };

    await update(ref(db, `${EMPADRONADOS_PATH}/${id}`), updateData);
    
    await writeAuditLog({
      actorUid,
      targetUid: id,
      accion: 'actualizar_empadronado',
      moduloId: 'empadronados',
      old: oldData,
      new: { ...oldData, ...updateData }
    });

    return true;
  } catch (error) {
    console.error('Error updating empadronado:', error);
    return false;
  }
};

// Eliminar empadronado
export const deleteEmpadronado = async (
  id: string, 
  actorUid: string,
  motivo: string
): Promise<boolean> => {
  try {
    const oldData = await getEmpadronado(id);
    if (!oldData) return false;

    await remove(ref(db, `${EMPADRONADOS_PATH}/${id}`));
    
    await writeAuditLog({
      actorUid,
      targetUid: id,
      accion: 'eliminar_empadronado',
      moduloId: 'empadronados',
      old: oldData,
      new: { motivo }
    });

    return true;
  } catch (error) {
    console.error('Error deleting empadronado:', error);
    return false;
  }
};

// Buscar empadronados por nombre o número de padrón
export const searchEmpadronados = async (searchTerm: string): Promise<Empadronado[]> => {
  try {
    const empadronados = await getEmpadronados();
    const term = searchTerm.toLowerCase();
    
    return empadronados.filter(e => 
      e.nombre.toLowerCase().includes(term) ||
      e.apellidos.toLowerCase().includes(term) ||
      e.numeroPadron.toLowerCase().includes(term) ||
      e.dni.toLowerCase().includes(term) ||
      (e.miembrosFamilia && e.miembrosFamilia.some(miembro => 
        miembro.nombre.toLowerCase().includes(term) || 
        miembro.apellidos.toLowerCase().includes(term)
      ))
    );
  } catch (error) {
    console.error('Error searching empadronados:', error);
    return [];
  }
};

// Obtener estadísticas
export const getEmpadronadosStats = async (): Promise<EmpadronadosStats> => {
  try {
    const empadronados = await getEmpadronados();
    
    return {
      total: empadronados.length,
      viven: empadronados.filter(e => e.vive).length,
      construida: empadronados.filter(e => e.estadoVivienda === 'construida').length,
      construccion: empadronados.filter(e => e.estadoVivienda === 'construccion').length,
      terreno: empadronados.filter(e => e.estadoVivienda === 'terreno').length,
      masculinos: empadronados.filter(e => e.genero === 'masculino').length,
      femeninos: empadronados.filter(e => e.genero === 'femenino').length,
      habilitados: empadronados.filter(e => e.habilitado).length
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      total: 0,
      viven: 0,
      construida: 0,
      construccion: 0,
      terreno: 0,
      masculinos: 0,
      femeninos: 0,
      habilitados: 0
    };
  }
};

// Verificar si un número de padrón ya existe
export const isNumeroPadronUnique = async (numeroPadron: string, excludeId?: string): Promise<boolean> => {
  try {
    const empadronados = await getEmpadronados();
    return !empadronados.some(e => e.numeroPadron === numeroPadron && e.id !== excludeId);
  } catch (error) {
    console.error('Error checking numero padron:', error);
    return false;
  }
};