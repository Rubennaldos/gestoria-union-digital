// src/services/acceso.ts
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

/** Base añadida a cada registro (permite reflejar en Seguridad) */
type BaseRegistro = {
  porticoId: string;
  estado?: "pendiente" | "autorizado" | "denegado";
  estadoPortico?: string;
  createdAt?: any; // serverTimestamp
};

function buildBase(
  porticoId: string,
  estado: BaseRegistro["estado"] = "pendiente"
): BaseRegistro {
  return {
    porticoId,
    estado,
    estadoPortico: `${estado}#${porticoId}`,
    createdAt: serverTimestamp(), // conservar tal cual (objeto especial)
  };
}

/** Quita undefined profundo sin tocar serverTimestamp */
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

/** Lee nombre completo y padrón del empadronado (para snapshot en Seguridad) */
async function readEmpadronadoSnapshot(empadronadoId: string): Promise<{
  solicitadoPorNombre: string | null;
  solicitadoPorPadron: string | null;
}> {
  try {
    const empSnap = await get(ref(db, `empadronados/${empadronadoId}`));
    if (!empSnap.exists()) return { solicitadoPorNombre: null, solicitadoPorPadron: null };
    const emp: any = empSnap.val();
    const solicitadoPorNombre = [emp?.nombre, emp?.apellidos].filter(Boolean).join(" ").trim() || null;
    const solicitadoPorPadron = emp?.numeroPadron ? String(emp.numeroPadron) : null;
    return { solicitadoPorNombre, solicitadoPorPadron };
  } catch {
    return { solicitadoPorNombre: null, solicitadoPorPadron: null };
  }
}

/* ──────────────────────────────────────────────────────────────
   VISITAS
   ────────────────────────────────────────────────────────────── */

/** Entrada simple desde el formulario de visitas */
export type NuevaVisitaInput = {
  empadronadoId: string;
  tipoAcceso: "peatonal" | "vehicular";
  placa?: string;
  visitantes: { id?: string; nombre: string; dni: string }[];
  menores: number;
  porticoId: string; // para Seguridad
};

/**
 * Crea una nueva visita y la refleja en:
 * - acceso/visitas/{id}
 * - seguridad/porticos/{porticoId}/pendientes/{id}
 */
export async function registrarVisita(data: NuevaVisitaInput) {
  if (!data?.porticoId) throw new Error("Falta porticoId al registrar la visita");
  if (!data?.empadronadoId) throw new Error("Falta empadronadoId (vecino dueño de la solicitud)");

  const id = push(child(ref(db), "acceso/visitas")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  // normalizar visitantes (ignoramos campos extra como id)
  const visitantes = (data.visitantes || []).map((v) => ({
    nombre: (v?.nombre || "").trim(),
    dni: (v?.dni || "").trim(),
  }));

  // snapshot del empadronado (nombre y padrón) para la UI de Seguridad
  const { solicitadoPorNombre, solicitadoPorPadron } = await readEmpadronadoSnapshot(
    data.empadronadoId
  );

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
    empadronadoId: data.empadronadoId,
    solicitadoPorNombre, // 👈 ya no “no disponible”
    solicitadoPorPadron,
    // compat: primer visitante visible
    nombre: visitantes[0]?.nombre || "",
    dni: visitantes[0]?.dni || "",
    createdAt: base.createdAt,
    tipo: "visitante",
  });

  await update(ref(db), updates);
  return id;
}

/* ──────────────────────────────────────────────────────────────
   TRABAJADORES / PROVEEDORES
   ────────────────────────────────────────────────────────────── */

export async function registrarTrabajadores(
  data: Omit<RegistroTrabajadores, "estado" | "estadoPortico" | "createdAt"> & {
    porticoId: string;
  }
) {
  if (!data?.porticoId) throw new Error("Falta porticoId al registrar trabajadores");
  if (!data?.empadronadoId) throw new Error("Falta empadronadoId");

  const id = push(child(ref(db), "acceso/trabajadores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const { solicitadoPorNombre, solicitadoPorPadron } = await readEmpadronadoSnapshot(
    data.empadronadoId
  );

  const cleanedData = stripUndefinedDeep(data as any);
  const payload: any = { ...cleanedData, ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/trabajadores/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = stripUndefinedDeep({
    id,
    empadronadoId: data.empadronadoId,
    solicitadoPorNombre,
    solicitadoPorPadron,
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
  if (!data?.porticoId) throw new Error("Falta porticoId al registrar proveedor");
  if (!data?.empadronadoId) throw new Error("Falta empadronadoId");

  const id = push(child(ref(db), "acceso/proveedores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const { solicitadoPorNombre, solicitadoPorPadron } = await readEmpadronadoSnapshot(
    data.empadronadoId
  );

  const cleanedData = stripUndefinedDeep(data as any);
  const payload: any = { ...cleanedData, ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/proveedores/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = stripUndefinedDeep({
    id,
    empadronadoId: data.empadronadoId,
    solicitadoPorNombre,
    solicitadoPorPadron,
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
  const q = query(ref(db, "acceso/favoritos"), orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snap = await get(q);
  if (!snap.exists()) return [];
  const todos: FavoritoUsuario[] = Object.values(snap.val());
  return todos.filter((f: any) => f.tipo === tipo).sort((a: any, b: any) => tsFrom(b) - tsFrom(a));
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
   Historial por empadronado
   ────────────────────────────────────────────────────────────── */
export async function obtenerVisitasPorEmpadronado(empadronadoId: string): Promise<any[]> {
  const snap = await get(ref(db, "acceso/visitas"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
  return arr.filter((v) => (v as any).empadronadoId === empadronadoId).sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerTrabajadoresPorEmpadronado(empadronadoId: string): Promise<any[]> {
  const snap = await get(ref(db, "acceso/trabajadores"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
  return arr.filter((v) => (v as any).empadronadoId === empadronadoId).sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerProveedoresPorEmpadronado(empadronadoId: string): Promise<any[]> {
  const snap = await get(ref(db, "acceso/proveedores"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
  return arr.filter((v) => (v as any).empadronadoId === empadronadoId).sort((a, b) => tsFrom(b) - tsFrom(a));
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

/* ──────────────────────────────────────────────────────────────
   BACKFILL: completar pendientes sin snapshot de vecino
   ────────────────────────────────────────────────────────────── */
type BackfillResultado = { revisados: number; actualizados: number; omitidos: number };

export async function backfillPendientesPortico(
  porticoId: string = "principal"
): Promise<BackfillResultado> {
  const basePath = `seguridad/porticos/${porticoId}/pendientes`;
  const snapPend = await get(ref(db, basePath));
  if (!snapPend.exists()) return { revisados: 0, actualizados: 0, omitidos: 0 };

  const pendientes: Record<string, any> = snapPend.val();
  let revisados = 0;
  let actualizados = 0;
  let omitidos = 0;

  async function leerRegistro(id: string) {
    const pVis = await get(ref(db, `acceso/visitas/${id}`));
    if (pVis.exists()) return { tipo: "visitante" as const, reg: pVis.val() };

    const pTra = await get(ref(db, `acceso/trabajadores/${id}`));
    if (pTra.exists()) return { tipo: "trabajador" as const, reg: pTra.val() };

    const pProv = await get(ref(db, `acceso/proveedores/${id}`));
    if (pProv.exists()) return { tipo: "proveedor" as const, reg: pProv.val() };

    return null;
  }

  const updates: Record<string, any> = {};

  for (const [id, pend] of Object.entries(pendientes)) {
    revisados++;

    if (pend?.solicitadoPorNombre || pend?.solicitadoPorPadron) {
      omitidos++;
      continue;
    }

    const info = await leerRegistro(id);
    if (!info) {
      omitidos++;
      continue;
    }

    const empId = info.reg?.empadronadoId;
    if (!empId) {
      omitidos++;
      continue;
    }

    const { solicitadoPorNombre, solicitadoPorPadron } = await readEmpadronadoSnapshot(empId);

    if (!solicitadoPorNombre && !solicitadoPorPadron) {
      omitidos++;
      continue;
    }

    updates[`${basePath}/${id}/solicitadoPorNombre`] = solicitadoPorNombre || null;
    updates[`${basePath}/${id}/solicitadoPorPadron`] = solicitadoPorPadron || null;
    actualizados++;
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }

  return { revisados, actualizados, omitidos };
}

/* ──────────────────────────────────────────────────────────────
   MIGRACIÓN: cambiar empadronadoId = "user123" por el real del usuario
   ────────────────────────────────────────────────────────────── */
/**
 * Corrige registros PENDIENTES que quedaron con empadronadoId = "user123"
 * en acceso/visitas, acceso/trabajadores y acceso/proveedores.
 * Úsalo 1 sola vez por usuario luego de crear su empadronado real.
 */
export async function migrarMisPendientesDesdeUser123(
  realEmpadronadoId: string
): Promise<{ cambiados: number }> {
  const updates: Record<string, any> = {};
  let cambiados = 0;

  const fixPath = async (
    path: "acceso/visitas" | "acceso/trabajadores" | "acceso/proveedores"
  ) => {
    const snap = await get(ref(db, path));
    if (!snap.exists()) return;

    const obj = snap.val() as Record<string, any>;
    for (const [id, r] of Object.entries(obj)) {
      if ((r as any)?.estado === "pendiente" && (r as any)?.empadronadoId === "user123") {
        updates[`${path}/${id}/empadronadoId`] = realEmpadronadoId;
        cambiados++;
      }
    }
  };

  await fixPath("acceso/visitas");
  await fixPath("acceso/trabajadores");
  await fixPath("acceso/proveedores");

  if (cambiados > 0) {
    await update(ref(db), updates);
  }
  return { cambiados };
}
