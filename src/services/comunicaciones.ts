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
 * Obtener mensajes activos para mostrar en el portal.
 * Lee desde public.mensajes_masivos (Supabase) — no requiere Firebase Auth.
 */
export const obtenerMensajesActivos = async (): Promise<MensajeMasivo[]> => {
  const { supabase } = await import('@/lib/supabase');
  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from('mensajes_masivos')
    .select('*')
    .eq('activo', true)
    .or(`fecha_inicio.is.null,fecha_inicio.lte.${ahora}`)
    .or(`fecha_fin.is.null,fecha_fin.gte.${ahora}`)
    .order('created_at', { ascending: false });

  if (error) {
    // Si la tabla no tiene filas o hay error de permisos, devolver vacío silenciosamente
    console.warn('[comunicaciones] obtenerMensajesActivos:', error.message);
    return [];
  }

  return (data ?? []).map(r => ({
    id:           String(r.id),
    titulo:       String(r.titulo),
    descripcion:  String(r.descripcion),
    imagen:       r.imagen ?? undefined,
    link:         r.link ?? undefined,
    estiloTexto:  (r.estilo_texto as MensajeMasivo['estiloTexto']) ?? {
      fuente: 'Inter', tamano: 16, color: '#000000',
      negrita: false, cursiva: false, alineacion: 'left',
    },
    activo:       Boolean(r.activo),
    fechaCreacion: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    fechaInicio:  r.fecha_inicio ? new Date(r.fecha_inicio).getTime() : undefined,
    fechaFin:     r.fecha_fin    ? new Date(r.fecha_fin).getTime()    : undefined,
    creadoPor:    String(r.creado_por),
  }));
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
