// Servicios para el módulo de comunicaciones usando Firebase RTDB
import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";
import { MensajeMasivo, CreateMensajeMasivoForm } from "@/types/comunicaciones";

const MENSAJES_PATH = 'comunicaciones/mensajes-masivos';

/**
 * Crear un nuevo mensaje masivo
 */
export const crearMensajeMasivo = async (
  creadoPor: string,
  mensajeData: CreateMensajeMasivoForm
): Promise<string> => {
  const mensajesRef = ref(db, MENSAJES_PATH);
  const newMensajeRef = push(mensajesRef);
  
  const mensaje: Omit<MensajeMasivo, 'id'> = {
    ...mensajeData,
    activo: true,
    fechaCreacion: Date.now(),
    creadoPor
  };

  await set(newMensajeRef, mensaje);
  return newMensajeRef.key!;
};

/**
 * Obtener todos los mensajes masivos (admin)
 */
export const obtenerTodosMensajes = async (): Promise<MensajeMasivo[]> => {
  const mensajesRef = ref(db, MENSAJES_PATH);
  const snapshot = await get(mensajesRef);
  
  if (!snapshot.exists()) return [];
  
  const mensajes: MensajeMasivo[] = [];
  snapshot.forEach((child) => {
    mensajes.push({
      id: child.key!,
      ...child.val()
    });
  });
  
  return mensajes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
};

/**
 * Obtener mensajes activos para mostrar en el portal
 */
export const obtenerMensajesActivos = async (): Promise<MensajeMasivo[]> => {
  const mensajesRef = ref(db, MENSAJES_PATH);
  const snapshot = await get(mensajesRef);
  
  if (!snapshot.exists()) return [];
  
  const mensajes: MensajeMasivo[] = [];
  const ahora = Date.now();
  
  snapshot.forEach((child) => {
    const mensaje = child.val();
    if (mensaje.activo) {
      // Verificar si está dentro del rango de fechas
      const dentroDeRango = (!mensaje.fechaInicio || mensaje.fechaInicio <= ahora) &&
                           (!mensaje.fechaFin || mensaje.fechaFin >= ahora);
      
      if (dentroDeRango) {
        mensajes.push({
          id: child.key!,
          ...mensaje
        });
      }
    }
  });
  
  return mensajes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
};

/**
 * Actualizar un mensaje masivo
 */
export const actualizarMensajeMasivo = async (
  mensajeId: string,
  updates: Partial<CreateMensajeMasivoForm>
): Promise<void> => {
  const mensajeRef = ref(db, `${MENSAJES_PATH}/${mensajeId}`);
  await update(mensajeRef, updates);
};

/**
 * Activar/Desactivar un mensaje
 */
export const toggleMensajeActivo = async (mensajeId: string, activo: boolean): Promise<void> => {
  const mensajeRef = ref(db, `${MENSAJES_PATH}/${mensajeId}`);
  await update(mensajeRef, { activo });
};

/**
 * Eliminar un mensaje masivo
 */
export const eliminarMensajeMasivo = async (mensajeId: string): Promise<void> => {
  const mensajeRef = ref(db, `${MENSAJES_PATH}/${mensajeId}`);
  await remove(mensajeRef);
};
