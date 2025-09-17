import {
  ref,
  push,
  set,
  update,
  get,
  child,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "@/config/firebase";
import {
  // NO usamos RegistroVisita para crear (tiene campos del backend)
  RegistroTrabajadores,
  RegistroProveedor,
  FavoritoUsuario,
} from "@/types/acceso";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function tsFrom(obj: any): number {
  const v = obj?.createdAt ?? obj?.fechaCreacion ?? 0;
  return typeof v === "number" ? v : 0;
}

type TipoAcceso = "visitante" | "trabajador" | "proveedor";

/** Base que añadimos a cada registro (permite reflejar en Seguridad) */
type BaseRegistro = {
  porticoId: string;
  estado?: "pendiente" | "autorizado" | "denegado";
  estadoPortico?: string;
  createdAt?: any;
};

function buildBase(
  porticoId: string,
  estado: BaseRegistro["estado"] = "pendiente"
) {
  return {
    porticoId,
    estado,
    estadoPortico: `${estado}#${porticoId}`,
    createdAt: serverTimestamp(), // 👈 conservar tal cual (objeto especial)
  };
}

/** Quita undefined profundo (objetos/arrays) sin tocar serverTimestamp */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return (value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const maybe = value as any;
    // conservar serverTimestamp (tiene propiedad .sv)
    if (maybe && typeof maybe === "object" && ".sv" in maybe) {
      return value;
    }
    const out: any = {};
    Object.entries(value as any).forEach(([k, v]) => {
      const cleaned = stripUndefinedDeep(v as any);
      if (cleaned !== undefined) out[k] = cleaned;
    });
    return out;
  }
  return (value === undefined ? (undefined as any) : value) as T;
}

/* ──────────────────────────────────────────────────────────────
   VISITAS (creación con un tipo de entrada simple)
   ────────────────────────────────────────────────────────────── */

/** Tipo de entrada para crear una visita (solo lo que viene del form) */
export type NuevaVisitaInput = {
  empadronadoId: string;
  tipoAcceso: "peatonal" | "vehicular";
  placa?: string;
  visitantes: { id?: string; nombre: string; dni: string }[];
  menores: number;
  porticoId: string; // necesario para reflejar en Seguridad
};

/**
 * Crea una nueva visita y la refleja en:
 * - acceso/visitas/{id}
 * - seguridad/porticos/{porticoId}/pendientes/{id}
 */
export async function registrarVisita(data: NuevaVisitaInput) {
  if (!data?.porticoId) {
    throw new Error("Falta porticoId al registrar la visita");
  }

  const id = push(child(ref(db), "acceso/visitas")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  // normalizar visitantes (ignoramos campos extra como id)
  const visitantes = (data.visitantes || []).map((v) => ({
    nombre: (v?.nombre || "").trim(),
    dni: (v?.dni || "").trim(),
  }));

  const payload = stripUndefinedDeep({
    empadronadoId: data.empadronadoId,
    tipoAcceso: data.tipoAcceso,
    placa: data.tipoAcceso === "vehicular" ? (data.placa || "").toUpperCase() : undefined,
    visitantes,
    menores: Number(data.menores || 0),
    ...base,
  });

  const updates: Record<string, unknown> = {};
  updates[`acceso/visitas/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = stripUndefinedDeep({
    id,
    nombre: visitantes[0]?.nombre || "",
    dni: visitantes[0]?.dni || "",
    createdAt: base.createdAt,
    tipo: "visitante",
  });

  await update(ref(db), updates);
  return id;
}

/* ──────────────────────────────────────────────────────────────
   TRABAJADORES / PROVEEDORES (estos sí pueden usar tus types)
   ────────────────────────────────────────────────────────────── */

export async function registrarTrabajadores(
  data: Omit<RegistroTrabajadores, "estado" | "estadoPortico" | "createdAt"> & {
    porticoId: string;
  }
) {
  if (!data?.porticoId) {
    throw new Error("Falta porticoId al registrar trabajadores");
  }

  const id = push(child(ref(db), "acceso/trabajadores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const cleanedData = stripUndefinedDeep(data as any);
  const payload: any = { ...cleanedData, ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/trabajadores/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = stripUndefinedDeep({
    id,
    createdAt: base.createdAt,
    tipo: "trabajador",
  });

  await update(ref(db), updates);
  return id;
}

export async function registrarProveedor(
  data: Omit<RegistroProveedor, "estado" | "estadoPortico" | "createdAt"> & {
    porticoId: string;
  }
) {
  if (!data?.porticoId) {
    throw new Error("Falta porticoId al registrar proveedor");
  }

  const id = push(child(ref(db), "acceso/proveedores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const cleanedData = stripUndefinedDeep(data as any);
  const payload: any = { ...cleanedData, ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/proveedores/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = stripUndefinedDeep({
    id,
    createdAt: base.createdAt,
    tipo: "proveedor",
  });

  await update(ref(db), updates);
  return id;
}

/* ──────────────────────────────────────────────────────────────
   Cambiar estado desde Pórtico
   ────────────────────────────────────────────────────────────── */
export async function cambiarEstadoAcceso(
  tipo: TipoAcceso,
  id: string,
  porticoId: string,
  nuevo: "autorizado" | "denegado",
  actor: string
) {
  const registroPath = `acceso/${
    tipo === "visitante" ? "visitas" : tipo === "trabajador" ? "trabajadores" : "proveedores"
  }/${id}`;

  const updates: Record<string, unknown> = {};
  updates[`${registroPath}/estado`] = nuevo;
  updates[`${registroPath}/estadoPortico`] = `${nuevo}#${porticoId}`;
  updates[`${registroPath}/fechaAutorizacion`] = Date.now();
  updates[`${registroPath}/autorizadoPor`] = actor;

  // quitar de pendientes del pórtico
  updates[`seguridad/porticos/${porticoId}/pendientes/${id}`] = null;

  await update(ref(db), updates);
}

/* ──────────────────────────────────────────────────────────────
   Favoritos
   ────────────────────────────────────────────────────────────── */
export async function obtenerFavoritosPorUsuario(
  empadronadoId: string,
  tipo: TipoAcceso
): Promise<FavoritoUsuario[]> {
  const q = query(
    ref(db, "acceso/favoritos"),
    orderByChild("empadronadoId"),
    equalTo(empadronadoId)
  );
  const snap = await get(q);
  if (!snap.exists()) return [];
  const todos: FavoritoUsuario[] = Object.values(snap.val());
  return todos
    .filter((f: any) => f.tipo === tipo)
    .sort((a: any, b: any) => tsFrom(b) - tsFrom(a));
}

/* ──────────────────────────────────────────────────────────────
   WhatsApp util
   ────────────────────────────────────────────────────────────── */
export function enviarMensajeWhatsApp(params: { telefono: string; mensaje: string }) {
  const tel = (params.telefono || "").replace(/[^\d]/g, "");
  if (!tel) {
    console.warn("enviarMensajeWhatsApp: teléfono vacío");
    return;
  }
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(params.mensaje || "")}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ──────────────────────────────────────────────────────────────
   Maestro de Obra
   ────────────────────────────────────────────────────────────── */
export type MaestroObraInput = {
  nombre: string;
  telefono?: string;
  dni?: string;
  empresa?: string;
  notas?: string;
  creadoPorUid?: string;
  [k: string]: any;
};

export async function crearMaestroObra(data: MaestroObraInput): Promise<string> {
  if (!data?.nombre || !data.nombre.trim()) throw new Error("El nombre es obligatorio");

  const id = push(child(ref(db), "acceso/maestrosObra")).key as string;

  const payload: any = stripUndefinedDeep({
    id,
    nombre: data.nombre.trim(),
    telefono: data.telefono ?? "",
    dni: data.dni ?? "",
    empresa: data.empresa ?? "",
    notas: data.notas ?? "",
    creadoPorUid: data.creadoPorUid ?? null,
    activo: true,
    createdAt: Date.now(),
  });

  await set(ref(db, `acceso/maestrosObra/${id}`), { ...payload });
  return id;
}

export async function actualizarMaestroObra(
  id: string,
  updates: Partial<MaestroObraInput> & { activo?: boolean }
) {
  const patch: any = stripUndefinedDeep({ ...updates, updatedAt: Date.now() });
  await update(ref(db, `acceso/maestrosObra/${id}`), patch);
}

export async function obtenerMaestroObraPorId(id: string): Promise<any | null> {
  const snap = await get(ref(db, `acceso/maestrosObra/${id}`));
  return snap.exists() ? snap.val() : null;
}

export async function obtenerMaestrosObra(opts?: {
  activo?: boolean;
  search?: string;
  limit?: number;
}): Promise<any[]> {
  const snap = await get(ref(db, "acceso/maestrosObra"));
  if (!snap.exists()) return [];
  let arr: any[] = Object.values(snap.val());

  if (typeof opts?.activo === "boolean") arr = arr.filter((m) => (m.activo ?? true) === opts.activo);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    arr = arr.filter((m) => (m.nombre || "").toLowerCase().includes(s));
  }
  arr.sort((a, b) => tsFrom(b) - tsFrom(a));
  if (opts?.limit && opts.limit > 0) arr = arr.slice(0, opts.limit);
  return arr;
}

export async function setActivoMaestroObra(id: string, activo: boolean) {
  await update(ref(db, `acceso/maestrosObra/${id}`), { activo, updatedAt: Date.now() });
}

/* ──────────────────────────────────────────────────────────────
   Historial por empadronado (sin índices extra)
   ────────────────────────────────────────────────────────────── */
export async function obtenerVisitasPorEmpadronado(empadronadoId: string): Promise<any[]> {
  const snap = await get(ref(db, "acceso/visitas"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
  return arr
    .filter((v) => (v as any).empadronadoId === empadronadoId)
    .sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerTrabajadoresPorEmpadronado(empadronadoId: string): Promise<any[]> {
  const snap = await get(ref(db, "acceso/trabajadores"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
  return arr
    .filter((v) => (v as any).empadronadoId === empadronadoId)
    .sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerProveedoresPorEmpadronado(empadronadoId: string): Promise<any[]> {
  const snap = await get(ref(db, "acceso/proveedores"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
  return arr
    .filter((v) => (v as any).empadronadoId === empadronadoId)
    .sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerHistorialAccesos(empadronadoId: string) {
  const [vis, tra, prov] = await Promise.all([
    obtenerVisitasPorEmpadronado(empadronadoId),
    obtenerTrabajadoresPorEmpadronado(empadronadoId),
    obtenerProveedoresPorEmpadronado(empadronadoId),
  ]);
  const tag = (arr: any[], tipo: TipoAcceso) => arr.map((x) => ({ ...x, tipo }));
  const all = [...tag(vis, "visitante"), ...tag(tra, "trabajador"), ...tag(prov, "proveedor")];
  all.sort((a, b) => tsFrom(b) - tsFrom(a));
  return all;
}
