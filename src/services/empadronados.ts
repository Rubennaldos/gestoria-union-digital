// src/services/empadronados.ts
import {
  ref,
  push,
  set,
  update,
  remove,
  get,
  runTransaction,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "@/config/firebase";
import {
  Empadronado,
  CreateEmpadronadoForm,
  UpdateEmpadronadoForm,
  EmpadronadosStats,
} from "@/types/empadronados";
import { Pago } from "@/types/cobranzas";
import { writeAuditLog } from "./rtdb";

const EMPADRONADOS_PATH = "empadronados";

/* ──────────────────────────────────────────────────────────────
   Helpers de periodos / fechas
   ────────────────────────────────────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const periodKeyFromDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // 2025-09
const compact = (period: string) => period.replace("-", ""); // 2025-09 -> 202509
const addMonths = (period: string, n: number) => {
  const [y, m] = period.split("-").map(Number);
  const base = new Date(y, m - 1 + n, 1);
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}`;
};
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

// Inicio histórico global (política) y día de corte mensual
const GLOBAL_START_CUTOFF = new Date(2025, 0, 15); // 15/01/2025
const CUTOFF_DAY = 14;

/** Devuelve el primer periodo (YYYY-MM) facturable para un empadronado,
 *  considerando:
 *  - No cobrar antes del 15/01/2025 (inicio global)
 *  - Corte mensual día 14 (<=14 cobra ese mes; >=15 cobra el mes siguiente)
 */
const firstBillablePeriod = (fechaIngresoMs?: number): string => {
  // Punto de partida: nunca antes del inicio global
  const join = fechaIngresoMs ? new Date(fechaIngresoMs) : GLOBAL_START_CUTOFF;
  const startDate = join < GLOBAL_START_CUTOFF ? GLOBAL_START_CUTOFF : join;

  // Corte 14: si se empadrona 15 o más, el primer cobro es el mes siguiente
  const shift = startDate.getDate() > CUTOFF_DAY ? 1 : 0;
  const base = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + shift,
    1
  );
  return periodKeyFromDate(base);
};

// (Se mantiene por compatibilidad en otros lugares donde lo uses)
const START_PERIOD = "2025-01";

/* ──────────────────────────────────────────────────────────────
   Config de cobranzas
   ────────────────────────────────────────────────────────────── */
const getCobranzasConfig = async (): Promise<{
  montoMensual: number;
  diaVencimiento: number;
}> => {
  const snap = await get(ref(db, "cobranzas/configuracion"));
  if (!snap.exists()) return { montoMensual: 50, diaVencimiento: 15 };

  const cfg = snap.val() as any;
  return {
    montoMensual: Number(cfg.montoMensual ?? 50),
    diaVencimiento: Number(cfg.diaVencimiento ?? 15),
  };
};

/* ──────────────────────────────────────────────────────────────
   Alta de PAGOS (compatibles con tu UI)
   - Guardado en: cobranzas/pagos
   - Índice de unicidad: cobranzas/pagos_index/{empId}/{YYYYMM}
   ────────────────────────────────────────────────────────────── */
const ensurePagoForMemberPeriod = async (
  emp: Pick<Empadronado, "id" | "numeroPadron">,
  period: string,
  authorUid: string = "system"
): Promise<boolean> => {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const yyyymm = compact(period);

  // Evitar duplicados por (empadronado, periodo)
  const lockRef = ref(db, `cobranzas/pagos_index/${emp.id}/${yyyymm}`);
  const tx = await runTransaction(lockRef, (cur) =>
    cur ? cur : { createdAt: Date.now() }
  );
  if (!tx.committed) return false;

  const { montoMensual, diaVencimiento } = await getCobranzasConfig();
  const fechaVenc = new Date(y, m - 1, diaVencimiento).toLocaleDateString(
    "es-PE"
  );

  const pagosRef = ref(db, "cobranzas/pagos");
  const pagoRef = push(pagosRef);

  const nuevo: Pago = {
    id: pagoRef.key!,
    empadronadoId: emp.id,
    numeroPadron: emp.numeroPadron || "",
    mes: m,
    año: y, // si tu type usa 'anio', cámbialo aquí y en el tipo Pago
    monto: montoMensual,
    montoOriginal: montoMensual,
    fechaVencimiento: fechaVenc,
    estado: "pendiente",
    descuentos: [],
    recargos: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creadoPor: authorUid,
  };

  await set(pagoRef, nuevo);
  return true;
};

/* ──────────────────────────────────────────────────────────────
   Generación de cuotas
   ────────────────────────────────────────────────────────────── */

// Genera TODAS las cuotas desde el primer periodo facturable hasta el mes actual
export const ensureChargesForNewMember = async (
  empId: string,
  _ignoreStart?: string, // parámetro mantenido por compatibilidad (no se usa)
  authorUid: string = "system"
): Promise<number> => {
  const empSnap = await get(ref(db, `${EMPADRONADOS_PATH}/${empId}`));
  if (!empSnap.exists()) return 0;
  const emp = empSnap.val() as Empadronado;

  // Primer periodo según la fecha de ingreso y reglas (inicio global + corte 14)
  const startPeriod = firstBillablePeriod(emp.fechaIngreso);

  const today = new Date();
  const last = periodKeyFromDate(today);
  const diff = monthsBetween(startPeriod, last);

  let created = 0;
  for (let i = 0; i <= diff; i++) {
    const p = addMonths(startPeriod, i);
    const ok = await ensurePagoForMemberPeriod(
      { id: empId, numeroPadron: emp.numeroPadron },
      p,
      authorUid
    );
    if (ok) created++;
  }
  return created;
};

// Backfill para TODOS los empadronados respetando fechaIngreso + corte 14
export const backfillChargesForAllEmpadronados = async (
  _unusedStart: string = START_PERIOD, // compatibilidad
  authorUid: string = "system"
): Promise<number> => {
  const snap = await get(ref(db, EMPADRONADOS_PATH));
  if (!snap.exists()) return 0;

  const data = snap.val() as Record<string, Empadronado>;
  let total = 0;

  for (const empId of Object.keys(data)) {
    const emp = data[empId];
    if (emp?.habilitado === false) continue;
    total += await ensureChargesForNewMember(empId, undefined, authorUid);
  }
  return total;
};

// Asegura solo la cuota del MES ACTUAL (con bloqueo de periodo)
export const ensureCurrentMonthChargesForAll = async (
  authorUid: string = "system"
): Promise<number> => {
  const period = periodKeyFromDate(new Date());
  const yyyymm = compact(period);
  const periodLock = ref(db, `cobranzas/periods/${yyyymm}/generated`);

  const tx = await runTransaction(periodLock, (cur) =>
    cur ? cur : { at: Date.now() }
  );
  if (!tx.committed) return 0;

  const snap = await get(ref(db, EMPADRONADOS_PATH));
  if (!snap.exists()) return 0;

  const data = snap.val() as Record<string, Empadronado>;
  let created = 0;

  for (const empId of Object.keys(data)) {
    const emp = data[empId];
    if (emp?.habilitado === false) continue;
    const ok = await ensurePagoForMemberPeriod(
      { id: empId, numeroPadron: emp.numeroPadron },
      period,
      authorUid
    );
    if (ok) created++;
  }
  return created;
};

/* ──────────────────────────────────────────────────────────────
   Utils
   ────────────────────────────────────────────────────────────── */
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj))
    return obj.map(removeUndefined).filter((item) => item !== undefined);
  if (obj !== null && typeof obj === "object") {
    const cleanObj: any = {};
    Object.keys(obj).forEach((key) => {
      const value = removeUndefined(obj[key]);
      if (value !== undefined) cleanObj[key] = value;
    });
    return cleanObj;
  }
  return obj;
};

/* ──────────────────────────────────────────────────────────────
   Vinculación con usuarios del sistema
   ────────────────────────────────────────────────────────────── */
export const linkAuthToEmpadronado = async (
  empadronadoId: string,
  uid: string,
  email: string
) => {
  await update(ref(db, `${EMPADRONADOS_PATH}/${empadronadoId}`), {
    authUid: uid,
    emailAcceso: email,
    updatedAt: Date.now(),
  });
};

export const unlinkAuthFromEmpadronado = async (empadronadoId: string) => {
  await update(ref(db, `${EMPADRONADOS_PATH}/${empadronadoId}`), {
    authUid: null,
    emailAcceso: null,
    updatedAt: Date.now(),
  });
};

/* ──────────────────────────────────────────────────────────────
   Búsqueda directa por DNI o Nº de padrón
   (usa índices .indexOn ["dni","numeroPadron"] en las reglas)
   ────────────────────────────────────────────────────────────── */
export const findEmpadronadoByDniOrPadron = async (
  term: string
): Promise<Empadronado | null> => {
  const t = (term || "").trim();
  if (!t) return null;

  // 1) Por número de padrón
  let q1 = query(
    ref(db, EMPADRONADOS_PATH),
    orderByChild("numeroPadron"),
    equalTo(t)
  );
  let snap = await get(q1);
  if (snap.exists()) {
    const v = snap.val();
    return (Object.values(v)[0] as Empadronado) ?? null;
  }

  // 2) Por DNI
  let q2 = query(ref(db, EMPADRONADOS_PATH), orderByChild("dni"), equalTo(t));
  snap = await get(q2);
  if (snap.exists()) {
    const v = snap.val();
    return (Object.values(v)[0] as Empadronado) ?? null;
  }

  return null;
};

/* ──────────────────────────────────────────────────────────────
   CRUD Empadronados
   ────────────────────────────────────────────────────────────── */

// Crear empadronado → AUTOGENERA pagos desde su primer periodo facturable
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
      creadoPor: actorUid,
    };

    await set(empadronadoRef, removeUndefined(empadronado));

    // Genera cuotas desde el primer periodo facturable (fechaIngreso + corte 14 + inicio global)
    await ensureChargesForNewMember(id, undefined, actorUid);

    await writeAuditLog({
      actorUid,
      accion: "crear_empadronado",
      moduloId: "empadronados",
      new: empadronado,
    });

    return id;
  } catch (error) {
    console.error("Error creating empadronado:", error);
    return null;
  }
};

// Obtener todos
export const getEmpadronados = async (): Promise<Empadronado[]> => {
  try {
    const snapshot = await get(ref(db, EMPADRONADOS_PATH));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data) as Empadronado[];
  } catch (error) {
    console.error("Error getting empadronados:", error);
    return [];
  }
};

// Obtener por ID
export const getEmpadronado = async (
  id: string
): Promise<Empadronado | null> => {
  try {
    const snapshot = await get(ref(db, `${EMPADRONADOS_PATH}/${id}`));
    return snapshot.exists() ? (snapshot.val() as Empadronado) : null;
  } catch (error) {
    console.error("Error getting empadronado:", error);
    return null;
  }
};

// Alias claro por si lo usas en otros módulos
export const getEmpadronadoById = getEmpadronado;

// Actualizar
export const updateEmpadronado = async (
  id: string,
  updates: UpdateEmpadronadoForm,
  actorUid: string
): Promise<boolean> => {
  try {
    const oldData = await getEmpadronado(id);
    if (!oldData) return false;

    const updateData = removeUndefined({
      ...updates,
      updatedAt: Date.now(),
      modificadoPor: actorUid,
    });

    await update(ref(db, `${EMPADRONADOS_PATH}/${id}`), updateData);

    await writeAuditLog({
      actorUid,
      targetUid: id,
      accion: "actualizar_empadronado",
      moduloId: "empadronados",
      old: oldData,
      new: { ...oldData, ...updateData },
    });

    return true;
  } catch (error) {
    console.error("Error updating empadronado:", error);
    return false;
  }
};

// Eliminar
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
      accion: "eliminar_empadronado",
      moduloId: "empadronados",
      old: oldData,
      new: { motivo },
    });

    return true;
  } catch (error) {
    console.error("Error deleting empadronado:", error);
    return false;
  }
};

// Buscar (cliente) — compatible con tu UI actual
export const searchEmpadronados = async (
  searchTerm: string
): Promise<Empadronado[]> => {
  try {
    const empadronados = await getEmpadronados();
    const term = (searchTerm || "").toLowerCase();

    return empadronados.filter((e: any) => {
      const hayMiembros = Array.isArray(e?.miembrosFamilia);
      const matchMiembros =
        hayMiembros &&
        e.miembrosFamilia.some(
          (m: any) =>
            String(m?.nombre || "").toLowerCase().includes(term) ||
            String(m?.apellidos || "").toLowerCase().includes(term)
        );

      return (
        String(e.nombre || "").toLowerCase().includes(term) ||
        String(e.apellidos || "").toLowerCase().includes(term) ||
        String(e.numeroPadron || "").toLowerCase().includes(term) ||
        String(e.dni || "").toLowerCase().includes(term) ||
        !!matchMiembros
      );
    });
  } catch (error) {
    console.error("Error searching empadronados:", error);
    return [];
  }
};

// Estadísticas simples
export const getEmpadronadosStats = async (): Promise<EmpadronadosStats> => {
  try {
    const empadronados = await getEmpadronados();

    return {
      total: empadronados.length,
      viven: empadronados.filter((e: any) => !!e.vive).length,
      construida: empadronados.filter(
        (e: any) => e.estadoVivienda === "construida"
      ).length,
      construccion: empadronados.filter(
        (e: any) => e.estadoVivienda === "construccion"
      ).length,
      terreno: empadronados.filter(
        (e: any) => e.estadoVivienda === "terreno"
      ).length,
      masculinos: empadronados.filter(
        (e: any) => e.genero === "masculino"
      ).length,
      femeninos: empadronados.filter(
        (e: any) => e.genero === "femenino"
      ).length,
      habilitados: empadronados.filter((e: any) => !!e.habilitado).length,
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return {
      total: 0,
      viven: 0,
      construida: 0,
      construccion: 0,
      terreno: 0,
      masculinos: 0,
      femeninos: 0,
      habilitados: 0,
    };
  }
};

// Unicidad de padrón
export const isNumeroPadronUnique = async (
  numeroPadron: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    const empadronados = await getEmpadronados();
    return !empadronados.some(
      (e) => e.numeroPadron === numeroPadron && e.id !== excludeId
    );
  } catch (error) {
    console.error("Error checking numero padron:", error);
    return false;
  }
};

// Buscar empadronado por authUid (acceso rápido desde sesión)
export const obtenerEmpadronadoPorAuthUid = async (
  authUid: string
): Promise<Empadronado | null> => {
  try {
    const empadronadosRef = ref(db, EMPADRONADOS_PATH);
    const empadronadosQuery = query(
      empadronadosRef,
      orderByChild("authUid"),
      equalTo(authUid)
    );
    const snapshot = await get(empadronadosQuery);

    if (!snapshot.exists()) return null;

    let empadronado: Empadronado | null = null;
    snapshot.forEach((child) => {
      empadronado = { id: child.key!, ...(child.val() as Empadronado) };
    });

    return empadronado;
  } catch (error) {
    console.error("Error getting empadronado by authUid:", error);
    return null;
  }
};
