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
const CHARGES_PATH = "cobranzas/charges";
const PERIODS_LOCK_PATH = "cobranzas/periods";

/* ──────────────────────────────────────────────────────────────
   Helpers de periodos / fechas
   ────────────────────────────────────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const periodKeyFromDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // "YYYY-MM"
const compact = (period: string) => period.replace("-", ""); // "YYYY-MM" -> "YYYYMM"
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
const ymd = (y: number, m: number, d: number) => new Date(y, m - 1, d);

/** Política global: el sistema arranca 15/01/2025 */
const POLICY_START = ymd(2025, 1, 15);

/* ──────────────────────────────────────────────────────────────
   Config de cobranzas
   ────────────────────────────────────────────────────────────── */
export type CobranzasConfig = {
  montoMensual: number; // S/
  diaVencimiento: number; // p.ej. 15
  diaCierreMes: number; // p.ej. 14 (1–14 entra; 15+ siguiente mes)
};

export const getCobranzasConfig = async (): Promise<CobranzasConfig> => {
  const snap = await get(ref(db, "cobranzas/configuracion"));
  const cfg = (snap.exists() ? snap.val() : {}) as any;
  return {
    montoMensual: Number(cfg?.montoMensual ?? 50),
    diaVencimiento: Number(cfg?.diaVencimiento ?? 15),
    diaCierreMes: Number(cfg?.diaCierre ?? 14), // ojo: el campo en config es "diaCierre"
  };
};

/** Calcula el primer "YYYY-MM" a cobrar respetando política y día de cierre. */
const firstChargePeriodForEmp = async (emp: Empadronado): Promise<string> => {
  const { diaCierreMes } = await getCobranzasConfig();
  const ingresoDate = new Date(emp.fechaIngreso || 0);

  if (!emp.fechaIngreso || ingresoDate < POLICY_START) return "2025-01";

  const y = ingresoDate.getFullYear();
  const m = ingresoDate.getMonth() + 1;
  const d = ingresoDate.getDate();

  if (d <= diaCierreMes) {
    return `${y}-${pad2(m)}`;
  } else {
    const next = new Date(y, m - 1 + 1, 1);
    return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
  }
};

/* ──────────────────────────────────────────────────────────────
   Alta de CHARGES mensuales (no quincenas)
   ────────────────────────────────────────────────────────────── */
const ensureChargeForMemberPeriod = async (
  emp: Pick<Empadronado, "id" | "numeroPadron">,
  period: string,
  _authorUid: string = "system"
): Promise<boolean> => {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const yyyymm = compact(period);

  const { montoMensual, diaVencimiento } = await getCobranzasConfig();
  const fechaVenc = new Date(y, m - 1, diaVencimiento).toLocaleDateString("es-PE");

  const node = `${CHARGES_PATH}/${yyyymm}/${emp.id}`;
  const snap = await get(ref(db, node));
  if (snap.exists()) {
    const vals = snap.val();
    // Si ya hay un cargo "mensual" (sin quincena) para ese mes, no crear otro
    const alreadyMonthly = Object.values<any>(vals).some((c) => !("quincena" in c));
    if (alreadyMonthly) return false;
  }

  const chargeRef = push(ref(db, node));
  await set(chargeRef, {
    empadronadoId: emp.id,
    numeroPadron: emp.numeroPadron || "",
    periodo: period,
    vencimiento: fechaVenc,
    montoBase: montoMensual,
    descuentos: [],
    recargos: [],
    total: montoMensual,
    saldo: montoMensual,
    estado: "pendiente",
    timestamps: { creado: new Date().toISOString(), actualizado: new Date().toISOString() },
  });

  return true;
};

/** Genera cuotas desde el primer periodo válido del empadronado hasta el mes actual. */
export const ensureChargesForNewMember = async (
  empId: string,
  _ignored?: string,
  authorUid: string = "system"
): Promise<number> => {
  const empSnap = await get(ref(db, `${EMPADRONADOS_PATH}/${empId}`));
  if (!empSnap.exists()) return 0;
  const emp = empSnap.val() as Empadronado;

  const first = await firstChargePeriodForEmp(emp);
  const last = periodKeyFromDate(new Date());
  const diff = monthsBetween(first, last);

  let created = 0;
  for (let i = 0; i <= diff; i++) {
    const p = addMonths(first, i);
    const ok = await ensureChargeForMemberPeriod({ id: empId, numeroPadron: emp.numeroPadron }, p, authorUid);
    if (ok) created++;
  }
  return created;
};

/** Backfill para TODOS (respeta las reglas nuevas) */
export const backfillChargesForAllEmpadronados = async (
  _ignored?: string,
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

/** Genera SOLO la cuota del mes actual para todos (sin duplicar) */
export const ensureCurrentMonthChargesForAll = async (authorUid: string = "system"): Promise<number> => {
  const period = periodKeyFromDate(new Date());
  const yyyymm = compact(period);
  const periodLock = ref(db, `${PERIODS_LOCK_PATH}/${yyyymm}/generated`);

  const tx = await runTransaction(periodLock, (cur) => (cur ? cur : { at: Date.now() }));
  if (!tx.committed) return 0;

  const snap = await get(ref(db, EMPADRONADOS_PATH));
  if (!snap.exists()) return 0;

  const data = snap.val() as Record<string, Empadronado>;
  let created = 0;

  for (const empId of Object.keys(data)) {
    const emp = data[empId];
    if (emp?.habilitado === false) continue;
    const ok = await ensureChargeForMemberPeriod({ id: empId, numeroPadron: emp.numeroPadron }, period, authorUid);
    if (ok) created++;
  }
  return created;
};

/* ──────────────────────────────────────────────────────────────
   Utils
   ────────────────────────────────────────────────────────────── */
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(removeUndefined).filter((item) => item !== undefined);
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
   (Mantenemos las herramientas sobre /cobranzas/pagos para limpieza histórica)
   ────────────────────────────────────────────────────────────── */
export const dedupePagosForAll = async (): Promise<{ kept: number; removed: number }> => {
  const pagosSnap = await get(ref(db, "cobranzas/pagos"));
  if (!pagosSnap.exists()) return { kept: 0, removed: 0 };

  const all = pagosSnap.val() as Record<string, { empadronadoId: string; año: number; mes: number }>;

  const seen = new Map<string, string>();
  let kept = 0;
  let removed = 0;

  await remove(ref(db, "cobranzas/pagos_index"));

  for (const [pagoId, p] of Object.entries(all)) {
    const key = `${p.empadronadoId}:${p.año}${pad2(p.mes)}`;
    if (!seen.has(key)) {
      seen.set(key, pagoId);
      kept++;
      await set(ref(db, `cobranzas/pagos_index/${p.empadronadoId}/${p.año}${pad2(p.mes)}`), {
        createdAt: Date.now(),
      });
    } else {
      await remove(ref(db, `cobranzas/pagos/${pagoId}`));
      removed++;
    }
  }
  return { kept, removed };
};

/* Reconciliación completa (trabaja sobre /cobranzas/pagos legacy) */
export const reconcilePagosForAll = async (
  authorUid: string = "system"
): Promise<{ totalEmp: number; removedOutOfRange: number; removedDuplicates: number; createdMissing: number }> => {
  const empSnap = await get(ref(db, EMPADRONADOS_PATH));
  if (!empSnap.exists()) {
    return { totalEmp: 0, removedOutOfRange: 0, removedDuplicates: 0, createdMissing: 0 };
  }

  const allEmp = empSnap.val() as Record<string, Empadronado>;

  const pagosSnap = await get(ref(db, "cobranzas/pagos"));
  const allPagos: Record<string, any> = pagosSnap.exists() ? pagosSnap.val() : {};

  // agrupar pagos por empId
  const byEmp = new Map<string, Array<{ id: string; año: number; mes: number }>>();
  for (const [pagoId, p] of Object.entries(allPagos)) {
    const empId = (p as any).empadronadoId;
    if (!empId) continue;
    if (!byEmp.has(empId)) byEmp.set(empId, []);
    byEmp.get(empId)!.push({ id: pagoId, año: (p as any).año, mes: (p as any).mes });
  }

  const last = periodKeyFromDate(new Date());

  let removedOutOfRange = 0;
  let removedDuplicates = 0;
  let createdMissing = 0;
  let totalEmp = 0;

  await remove(ref(db, "cobranzas/pagos_index"));

  for (const empId of Object.keys(allEmp)) {
    const emp = allEmp[empId];
    if (emp?.habilitado === false) continue;
    totalEmp++;

    const first = await firstChargePeriodForEmp(emp);

    const diff = monthsBetween(first, last);
    const validPeriods = new Set<string>();
    for (let i = 0; i <= diff; i++) validPeriods.add(addMonths(first, i));

    const pagos = byEmp.get(empId) ?? [];
    const seen = new Set<string>(); // YYYY-MM

    for (const p of pagos) {
      const period = `${p.año}-${pad2(p.mes)}`;
      if (!validPeriods.has(period)) {
        await remove(ref(db, `cobranzas/pagos/${p.id}`));
        removedOutOfRange++;
        continue;
      }
      if (seen.has(period)) {
        await remove(ref(db, `cobranzas/pagos/${p.id}`));
        removedDuplicates++;
        continue;
      }
      seen.add(period);
      await set(ref(db, `cobranzas/pagos_index/${empId}/${compact(period)}`), { createdAt: Date.now() });
    }

    for (const period of validPeriods) {
      if (!seen.has(period)) {
        const ok = await ensureChargeForMemberPeriod({ id: empId, numeroPadron: emp.numeroPadron }, period, authorUid);
        if (ok) createdMissing++;
      }
    }
  }

  return { totalEmp, removedOutOfRange, removedDuplicates, createdMissing };
};

/* ──────────────────────────────────────────────────────────────
   Vinculación con usuarios
   ────────────────────────────────────────────────────────────── */
export const linkAuthToEmpadronado = async (empadronadoId: string, uid: string, email: string) => {
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
   Búsqueda directa
   ────────────────────────────────────────────────────────────── */
export const findEmpadronadoByDniOrPadron = async (term: string): Promise<Empadronado | null> => {
  const t = (term || "").trim();
  if (!t) return null;

  // 1) Por número de padrón
  let q1 = query(ref(db, EMPADRONADOS_PATH), orderByChild("numeroPadron"), equalTo(t));
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

    // Generar sus charges (desde su primer período válido)
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

export const getEmpadronado = async (id: string): Promise<Empadronado | null> => {
  try {
    const snapshot = await get(ref(db, `${EMPADRONADOS_PATH}/${id}`));
    return snapshot.exists() ? (snapshot.val() as Empadronado) : null;
  } catch (error) {
    console.error("Error getting empadronado:", error);
    return null;
  }
};

// Alias
export const getEmpadronadoById = getEmpadronado;

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

export const deleteEmpadronado = async (id: string, actorUid: string, motivo: string): Promise<boolean> => {
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

export const searchEmpadronados = async (searchTerm: string): Promise<Empadronado[]> => {
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

export const getEmpadronadosStats = async (): Promise<EmpadronadosStats> => {
  try {
    const empadronados = await getEmpadronados();

    return {
      total: empadronados.length,
      viven: empadronados.filter((e: any) => !!e.vive).length,
      construida: empadronados.filter((e: any) => e.estadoVivienda === "construida").length,
      construccion: empadronados.filter((e: any) => e.estadoVivienda === "construccion").length,
      terreno: empadronados.filter((e: any) => e.estadoVivienda === "terreno").length,
      masculinos: empadronados.filter((e: any) => e.genero === "masculino").length,
      femeninos: empadronados.filter((e: any) => e.genero === "femenino").length,
      habilitados: empadronados.filter((e: any) => !!e.habilitado).length,
    };
  } catch {
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

export const isNumeroPadronUnique = async (numeroPadron: string, excludeId?: string): Promise<boolean> => {
  try {
    const empadronados = await getEmpadronados();
    return !empadronados.some((e) => e.numeroPadron === numeroPadron && e.id !== excludeId);
  } catch (error) {
    console.error("Error checking numero padron:", error);
    return false;
  }
};

export const obtenerEmpadronadoPorAuthUid = async (authUid: string): Promise<Empadronado | null> => {
  try {
    const empadronadosRef = ref(db, EMPADRONADOS_PATH);
    const empadronadosQuery = query(empadronadosRef, orderByChild("authUid"), equalTo(authUid));
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
