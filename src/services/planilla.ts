import { ref, push, get, set, remove, onValue, off } from "firebase/database";
import { db } from "@/config/firebase";
import {
  PersonalPlanilla,
  CreatePersonalPlanillaForm,
  UpdatePersonalPlanillaForm,
  PlanillaStats,
} from "@/types/planilla";
import { Empadronado } from "@/types/empadronados";

const PLANILLA_PATH = "planilla";
const EMPADRONADOS_PATH = "empadronados";

/**
 * Crear un nuevo registro en planilla
 */
export async function createPersonalPlanilla(
  data: CreatePersonalPlanillaForm,
  userId: string
): Promise<{ id: string; personal: PersonalPlanilla }> {
  try {
    // Obtener datos del empadronado
    const empadronadoRef = ref(db, `${EMPADRONADOS_PATH}/${data.empadronadoId}`);
    const empadronadoSnap = await get(empadronadoRef);
    
    if (!empadronadoSnap.exists()) {
      throw new Error("Empadronado no encontrado");
    }
    
    const empadronado = empadronadoSnap.val() as Empadronado;
    
    const planillaRef = ref(db, PLANILLA_PATH);
    const newRef = push(planillaRef);
    
    const personal: PersonalPlanilla = {
      id: newRef.key!,
      empadronadoId: data.empadronadoId,
      nombreCompleto: `${empadronado.nombre} ${empadronado.apellidos}`,
      dni: empadronado.dni,
      tipoPersonal: empadronado.tipoRegistro || 'residente',
      funcion: data.funcion,
      areaAsignada: data.areaAsignada,
      fechaContratacion: data.fechaContratacion,
      activo: data.activo,
      sueldo: data.sueldo,
      tipoContrato: data.tipoContrato,
      frecuenciaPago: data.frecuenciaPago,
      tieneAccesoSistema: data.tieneAccesoSistema,
      horariosAcceso: data.horariosAcceso,
      observaciones: data.observaciones,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creadoPor: userId,
    };
    
    await set(newRef, personal);
    
    return { id: newRef.key!, personal };
  } catch (error) {
    console.error("Error creating personal planilla:", error);
    throw error;
  }
}

/**
 * Obtener todo el personal de planilla
 */
export async function getPersonalPlanilla(): Promise<PersonalPlanilla[]> {
  try {
    const planillaRef = ref(db, PLANILLA_PATH);
    const snapshot = await get(planillaRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const data = snapshot.val();
    return Object.entries(data).map(([id, personal]) => ({
      ...(personal as PersonalPlanilla),
      id,
    }));
  } catch (error) {
    console.error("Error getting personal planilla:", error);
    throw error;
  }
}

/**
 * Obtener un registro específico de planilla
 */
export async function getPersonalById(id: string): Promise<PersonalPlanilla | null> {
  try {
    const personalRef = ref(db, `${PLANILLA_PATH}/${id}`);
    const snapshot = await get(personalRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return { ...(snapshot.val() as PersonalPlanilla), id };
  } catch (error) {
    console.error("Error getting personal by id:", error);
    throw error;
  }
}

/**
 * Actualizar personal en planilla
 */
export async function updatePersonalPlanilla(
  id: string,
  data: UpdatePersonalPlanillaForm,
  userId: string
): Promise<void> {
  try {
    const personalRef = ref(db, `${PLANILLA_PATH}/${id}`);
    const snapshot = await get(personalRef);
    
    if (!snapshot.exists()) {
      throw new Error("Personal no encontrado");
    }
    
    // Filtrar valores undefined
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    const updates = {
      ...cleanData,
      updatedAt: Date.now(),
      modificadoPor: userId,
    };
    
    await set(personalRef, { ...snapshot.val(), ...updates });
  } catch (error) {
    console.error("Error updating personal planilla:", error);
    throw error;
  }
}

/**
 * Eliminar personal de planilla
 */
export async function deletePersonalPlanilla(id: string): Promise<void> {
  try {
    const personalRef = ref(db, `${PLANILLA_PATH}/${id}`);
    await remove(personalRef);
  } catch (error) {
    console.error("Error deleting personal planilla:", error);
    throw error;
  }
}

/**
 * Suscribirse a cambios en planilla
 */
export function onPersonalPlanilla(
  callback: (personal: PersonalPlanilla[]) => void
): () => void {
  const planillaRef = ref(db, PLANILLA_PATH);
  
  const listener = onValue(planillaRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const data = snapshot.val();
    const personal = Object.entries(data).map(([id, p]) => ({
      ...(p as PersonalPlanilla),
      id,
    }));
    
    callback(personal);
  });
  
  return () => off(planillaRef, "value", listener);
}

/**
 * Obtener estadísticas de planilla
 */
export async function getPlanillaStats(): Promise<PlanillaStats> {
  try {
    const personal = await getPersonalPlanilla();
    
    return {
      totalPersonal: personal.length,
      activos: personal.filter(p => p.activo).length,
      inactivos: personal.filter(p => !p.activo).length,
      conAccesoSistema: personal.filter(p => p.tieneAccesoSistema).length,
      residentes: personal.filter(p => p.tipoPersonal === 'residente').length,
      personalSeguridad: personal.filter(p => p.tipoPersonal === 'personal_seguridad').length,
    };
  } catch (error) {
    console.error("Error getting planilla stats:", error);
    throw error;
  }
}

/**
 * Verificar si un usuario puede acceder al sistema en este momento
 */
export function puedeAccederAhora(personal: PersonalPlanilla): boolean {
  if (!personal.tieneAccesoSistema || !personal.activo) {
    return false;
  }
  
  if (!personal.horariosAcceso || personal.horariosAcceso.length === 0) {
    return false;
  }
  
  const ahora = new Date();
  
  // Mapear el día actual al formato correcto
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaActual = diasSemana[ahora.getDay()];
  
  // Buscar el horario del día actual que esté activo
  const horarioHoy = personal.horariosAcceso.find(h => h.dia === diaActual && h.activo);
  
  if (!horarioHoy) {
    return false;
  }
  
  // Convertir la hora actual a minutos desde medianoche
  const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  
  // Convertir horarios de inicio y fin a minutos
  const [inicioHora, inicioMin] = horarioHoy.horaInicio.split(':').map(Number);
  const [finHora, finMin] = horarioHoy.horaFin.split(':').map(Number);
  
  const inicioMinutos = inicioHora * 60 + inicioMin;
  const finMinutos = finHora * 60 + finMin;
  
  return horaActualMinutos >= inicioMinutos && horaActualMinutos <= finMinutos;
}
