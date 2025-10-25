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
import { FavoritoUsuario } from "@/types/acceso";

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
    createdAt: serverTimestamp(),
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
    if (!empSnap.exists())
      return { solicitadoPorNombre: null, solicitadoPorPadron: null };
    const emp: any = empSnap.val();
    const solicitadoPorNombre =
      [emp?.nombre, emp?.apellidos].filter(Boolean).join(" ").trim() || null;
    const solicitadoPorPadron = emp?.numeroPadron
      ? String(emp.numeroPadron)
      : null;
    return { solicitadoPorNombre, solicitadoPorPadron };
  } catch {
    return { solicitadoPorNombre: null, solicitadoPorPadron: null };
  }
}

/* ──────────────────────────────────────────────────────────────
   VISITAS
   ────────────────────────────────────────────────────────────── */

export type NuevaVisitaInput = {
  empadronadoId: string;
  tipoAcceso: "peatonal" | "vehicular";
  placa?: string;
  visitantes: { id?: string; nombre: string; dni: string }[];
  menores: number;
  porticoId: string;
};

export async function registrarVisita(data: NuevaVisitaInput) {
  if (!data?.porticoId) throw new Error("Falta porticoId al registrar la visita");

  const { solicitadoPorNombre, solicitadoPorPadron } =
    await readEmpadronadoSnapshot(data.empadronadoId);

  const id = push(child(ref(db), "acceso/visitas")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const visitantes = (data.visitantes || []).map((v) => ({
    nombre: (v?.nombre || "").trim(),
    dni: (v?.dni || "").trim(),
  }));

  const payload = stripUndefinedDeep({
    empadronadoId: data.empadronadoId,
    tipoAcceso: data.tipoAcceso,
    placa:
      data.tipoAcceso === "vehicular"
        ? (data.placa || "").toUpperCase()
        : undefined,
    visitantes,
    menores: Number(data.menores || 0),
    solicitadoPorNombre,
    solicitadoPorPadron,
    ...base,
  });

  // Crear el registro de visita
  await set(ref(db, `acceso/visitas/${id}`), payload);
  
  // Agregar a pendientes del pórtico
  await set(
    ref(db, `seguridad/porticos/${data.porticoId}/pendientes/${id}`),
    stripUndefinedDeep({
      id,
      empadronadoId: data.empadronadoId,
      nombre: visitantes[0]?.nombre || "",
      dni: visitantes[0]?.dni || "",
      createdAt: base.createdAt,
      tipo: "visitante",
      solicitadoPorNombre,
      solicitadoPorPadron,
    })
  );

  return id;
}

/* ──────────────────────────────────────────────────────────────
   TRABAJADORES / PROVEEDORES
   ────────────────────────────────────────────────────────────── */

/** NUEVO: inputs simples para evitar pedir id/fechaCreacion */
export type RegistrarTrabajadoresInput = {
  empadronadoId: string;
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[]; // Múltiples placas
  maestroObraId: string;
  maestroObraTemporal?: { nombre: string; dni: string }; // Datos temporales del encargado
  trabajadores: { nombre: string; dni: string; esMaestroObra?: boolean }[];
  porticoId: string;
};

export type RegistrarProveedorInput = {
  empadronadoId: string;
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[]; // Múltiples placas
  empresa: string;
  tipoServicio?: "gas" | "delivery" | "bodega" | "otro";
  porticoId: string;
};

export async function registrarTrabajadores(data: RegistrarTrabajadoresInput) {
  if (!data?.porticoId) throw new Error("Falta porticoId al registrar trabajadores");
  if (!data?.empadronadoId) throw new Error("Falta empadronadoId");

  const id = push(child(ref(db), "acceso/trabajadores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const { solicitadoPorNombre, solicitadoPorPadron } =
    await readEmpadronadoSnapshot(data.empadronadoId);

  const cleanedData = stripUndefinedDeep({
    empadronadoId: data.empadronadoId,
    tipoAcceso: data.tipoAcceso,
    placa:
      data.tipoAcceso === "vehicular"
        ? (data.placa || "").toUpperCase()
        : undefined,
    placas:
      data.tipoAcceso === "vehicular" && data.placas
        ? data.placas.map((p) => p.toUpperCase())
        : undefined,
    maestroObraId: data.maestroObraId,
    maestroObraTemporal: data.maestroObraTemporal || undefined,
    trabajadores: (data.trabajadores || []).map((t) => ({
      nombre: (t?.nombre || "").trim(),
      dni: (t?.dni || "").trim(),
      esMaestroObra: !!t?.esMaestroObra,
    })),
  });

  const payload: any = {
    ...cleanedData,
    solicitadoPorNombre,
    solicitadoPorPadron,
    ...base,
  };

  // Crear el registro de trabajadores
  await set(ref(db, `acceso/trabajadores/${id}`), payload);
  
  // Agregar a pendientes del pórtico
  await set(
    ref(db, `seguridad/porticos/${data.porticoId}/pendientes/${id}`),
    stripUndefinedDeep({
      id,
      empadronadoId: data.empadronadoId,
      solicitadoPorNombre,
      solicitadoPorPadron,
      createdAt: base.createdAt,
      tipo: "trabajador",
    })
  );

  return id;
}

export async function registrarProveedor(data: RegistrarProveedorInput) {
  if (!data?.porticoId) throw new Error("Falta porticoId al registrar proveedor");
  if (!data?.empadronadoId) throw new Error("Falta empadronadoId");

  const id = push(child(ref(db), "acceso/proveedores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  const { solicitadoPorNombre, solicitadoPorPadron } =
    await readEmpadronadoSnapshot(data.empadronadoId);

  const cleanedData = stripUndefinedDeep({
    empadronadoId: data.empadronadoId,
    tipoAcceso: data.tipoAcceso,
    placa:
      data.tipoAcceso === "vehicular"
        ? (data.placa || "").toUpperCase()
        : undefined,
    empresa: (data.empresa || "").trim(),
    tipoServicio: data.tipoServicio ?? "otro",
  });

  const payload: any = {
    ...cleanedData,
    solicitadoPorNombre,
    solicitadoPorPadron,
    ...base,
  };

  // Crear el registro de proveedor
  await set(ref(db, `acceso/proveedores/${id}`), payload);
  
  // Agregar a pendientes del pórtico
  await set(
    ref(db, `seguridad/porticos/${data.porticoId}/pendientes/${id}`),
    stripUndefinedDeep({
      id,
      empadronadoId: data.empadronadoId,
      solicitadoPorNombre,
      solicitadoPorPadron,
      createdAt: base.createdAt,
      tipo: "proveedor",
    })
  );

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
    tipo === "visitante"
      ? "visitas"
      : tipo === "trabajador"
      ? "trabajadores"
      : "proveedores"
  }/${id}`;

  // Actualizar el registro de acceso
  await update(ref(db, registroPath), {
    estado: nuevo,
    estadoPortico: `${nuevo}#${porticoId}`,
    fechaAutorizacion: Date.now(),
    autorizadoPor: actor,
  });

  // Eliminar de pendientes del pórtico
  await set(ref(db, `seguridad/porticos/${porticoId}/pendientes/${id}`), null);
}

/* ──────────────────────────────────────────────────────────────
   Favoritos
   ────────────────────────────────────────────────────────────── */
export async function obtenerFavoritosPorUsuario(
  empadronadoId: string,
  tipo: TipoAcceso
): Promise<FavoritoUsuario[]> {
  try {
    // Obtener todos los favoritos y filtrar en cliente (evita requerir índice)
    const snap = await get(ref(db, "acceso/favoritos"));
    if (!snap.exists()) return [];
    
    const todos: FavoritoUsuario[] = Object.values(snap.val());
    return todos
      .filter((f: any) => f.empadronadoId === empadronadoId && f.tipo === tipo)
      .sort((a: any, b: any) => tsFrom(b) - tsFrom(a));
  } catch (error) {
    console.error("Error al cargar favoritos:", error);
    return [];
  }
}

/* ──────────────────────────────────────────────────────────────
   WhatsApp util
   ────────────────────────────────────────────────────────────── */
export function enviarMensajeWhatsApp(params: {
  telefono: string;
  mensaje: string;
}) {
  const tel = (params.telefono || "").replace(/[^\d]/g, "");
  if (!tel) {
    console.warn("enviarMensajeWhatsApp: teléfono vacío");
    return;
  }
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(
    params.mensaje || ""
  )}`;
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

export async function crearMaestroObra(
  data: MaestroObraInput
): Promise<string> {
  if (!data?.nombre || !data.nombre.trim())
    throw new Error("El nombre es obligatorio");

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

export async function obtenerMaestroObraPorId(
  id: string
): Promise<any | null> {
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

  if (typeof opts?.activo === "boolean")
    arr = arr.filter((m) => (m.activo ?? true) === opts.activo);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    arr = arr.filter((m) => (m.nombre || "").toLowerCase().includes(s));
  }
  arr.sort((a, b) => tsFrom(b) - tsFrom(a));
  if (opts?.limit && opts.limit > 0) arr = arr.slice(0, opts.limit);
  return arr;
}

export async function setActivoMaestroObra(id: string, activo: boolean) {
  await update(ref(db, `acceso/maestrosObra/${id}`), {
    activo,
    updatedAt: Date.now(),
  });
}

/* ──────────────────────────────────────────────────────────────
   Historial por empadronado
   ────────────────────────────────────────────────────────────── */
export async function obtenerVisitasPorEmpadronado(
  empadronadoId: string
): Promise<any[]> {
  const snap = await get(ref(db, "acceso/visitas"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({
    id,
    ...v,
  }));
  return arr
    .filter((v) => (v as any).empadronadoId === empadronadoId)
    .sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerTrabajadoresPorEmpadronado(
  empadronadoId: string
): Promise<any[]> {
  const snap = await get(ref(db, "acceso/trabajadores"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({
    id,
    ...v,
  }));
  return arr
    .filter((v) => (v as any).empadronadoId === empadronadoId)
    .sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerProveedoresPorEmpadronado(
  empadronadoId: string
): Promise<any[]> {
  const snap = await get(ref(db, "acceso/proveedores"));
  if (!snap.exists()) return [];
  const arr: any[] = Object.entries(snap.val()).map(([id, v]: any) => ({
    id,
    ...v,
  }));
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
  const tag = (arr: any[], tipo: TipoAcceso) =>
    arr.map((x) => ({ ...x, tipo }));
  const all = [
    ...tag(vis, "visitante"),
    ...tag(tra, "trabajador"),
    ...tag(prov, "proveedor"),
  ];
  all.sort((a, b) => tsFrom(b) - tsFrom(a));
  return all;
}

/* ──────────────────────────────────────────────────────────────
   BACKFILL / MIGRACIÓN (igual)
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

    const { solicitadoPorNombre, solicitadoPorPadron } =
      await readEmpadronadoSnapshot(empId);

    if (!solicitadoPorNombre && !solicitadoPorPadron) {
      omitidos++;
      continue;
    }

    updates[`${basePath}/${id}/solicitadoPorNombre`] =
      solicitadoPorNombre || null;
    updates[`${basePath}/${id}/solicitadoPorPadron`] =
      solicitadoPorPadron || null;
    actualizados++;
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }

  return { revisados, actualizados, omitidos };
}

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
      if (
        (r as any)?.estado === "pendiente" &&
        (r as any)?.empadronadoId === "user123"
      ) {
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

/* ──────────────────────────────────────────────────────────────
   LISTAS RECURRENTES DE TRABAJADORES
   ────────────────────────────────────────────────────────────── */

export type CrearListaTrabajadoresInput = {
  empadronadoId: string;
  nombreLista: string;
  maestroObraId: string;
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[];
  trabajadores: { nombre: string; dni: string; esMaestroObra?: boolean }[];
  fechaInicio: number;
  fechaFin: number;
};

export async function crearListaTrabajadores(data: CrearListaTrabajadoresInput): Promise<string> {
  if (!data.empadronadoId) throw new Error("Falta empadronadoId");
  if (!data.nombreLista?.trim()) throw new Error("Falta nombre de la lista");
  if (!data.maestroObraId) throw new Error("Falta maestroObraId");
  if (!data.fechaInicio || !data.fechaFin) throw new Error("Faltan fechas");
  
  // Validar que el período no exceda 30 días
  const diffDays = (data.fechaFin - data.fechaInicio) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) throw new Error("El período máximo es de 30 días");
  if (diffDays < 0) throw new Error("La fecha de fin debe ser posterior a la fecha de inicio");

  const { solicitadoPorNombre, solicitadoPorPadron } = await readEmpadronadoSnapshot(data.empadronadoId);

  const id = push(child(ref(db), "acceso/listas_trabajadores")).key as string;

  const payload = stripUndefinedDeep({
    id,
    empadronadoId: data.empadronadoId,
    nombreLista: data.nombreLista.trim(),
    maestroObraId: data.maestroObraId,
    tipoAcceso: data.tipoAcceso,
    placa: data.tipoAcceso === "vehicular" ? data.placa?.toUpperCase() : undefined,
    placas: data.tipoAcceso === "vehicular" ? data.placas?.map(p => p.toUpperCase()) : undefined,
    trabajadores: (data.trabajadores || []).map((t) => ({
      id: push(child(ref(db), "temp")).key,
      nombre: t.nombre.trim(),
      dni: t.dni.trim(),
      esMaestroObra: !!t.esMaestroObra,
    })),
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    activa: true,
    solicitadoPorNombre,
    solicitadoPorPadron,
    createdAt: Date.now(),
  });

  await set(ref(db, `acceso/listas_trabajadores/${id}`), payload);
  return id;
}

export async function obtenerListasTrabajadores(empadronadoId: string): Promise<any[]> {
  if (!empadronadoId) return [];
  
  const listasRef = ref(db, "acceso/listas_trabajadores");
  const q = query(listasRef, orderByChild("empadronadoId"), equalTo(empadronadoId));
  
  const snap = await get(q);
  if (!snap.exists()) return [];
  
  const arr: any[] = Object.values(snap.val());
  return arr.sort((a, b) => tsFrom(b) - tsFrom(a));
}

export async function obtenerListaTrabajadoresPorId(id: string): Promise<any | null> {
  const snap = await get(ref(db, `acceso/listas_trabajadores/${id}`));
  return snap.exists() ? snap.val() : null;
}

export async function actualizarListaTrabajadores(
  id: string,
  updates: Partial<CrearListaTrabajadoresInput> & { activa?: boolean }
): Promise<void> {
  // Si se actualizan fechas, validar el período
  if (updates.fechaInicio && updates.fechaFin) {
    const diffDays = (updates.fechaFin - updates.fechaInicio) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) throw new Error("El período máximo es de 30 días");
    if (diffDays < 0) throw new Error("La fecha de fin debe ser posterior a la fecha de inicio");
  }

  const cleanUpdates = stripUndefinedDeep({
    ...updates,
    updatedAt: Date.now(),
  });

  await update(ref(db, `acceso/listas_trabajadores/${id}`), cleanUpdates);
}

export async function eliminarListaTrabajadores(id: string): Promise<void> {
  await set(ref(db, `acceso/listas_trabajadores/${id}`), null);
}

export async function obtenerListasActivasParaSeguridad(): Promise<any[]> {
  const snap = await get(ref(db, "acceso/listas_trabajadores"));
  if (!snap.exists()) return [];
  
  const ahora = Date.now();
  const arr: any[] = Object.values(snap.val());
  
  return arr.filter((lista) => 
    lista.activa && 
    lista.fechaInicio <= ahora && 
    lista.fechaFin >= ahora
  );
}
