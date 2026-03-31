// src/services/empadronados.ts
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  EMPADRONADOS CRUD  →  Supabase (PostgreSQL)                            │
// │  Cobranzas (charges / periods / pagos)  →  Firebase RTDB               │
// │  Los helpers de cobranzas siguen en RTDB hasta su migración completa.   │
// └─────────────────────────────────────────────────────────────────────────┘

// ─── Firebase imports (solo para cobranzas) ──────────────────────────────────
import {
  ref,
  push,
  set,
  update,
  remove,
  get,
  runTransaction,
} from "firebase/database";
import { db } from "@/config/firebase";

// ─── Supabase (empadronados CRUD) ────────────────────────────────────────────
import { supabase } from "@/lib/supabase";

// ─── Tipos y auditoría ────────────────────────────────────────────────────────
import {
  Empadronado,
  CreateEmpadronadoForm,
  UpdateEmpadronadoForm,
  EmpadronadosStats,
} from "@/types/empadronados";
import { writeAuditLog } from "./rtdb";

// =============================================================================
// 1. HELPERS DE FECHA
// =============================================================================

/** "DD/MM/YYYY" → "YYYY-MM-DD"  (para columna `date` de PostgreSQL) */
const ddmmyyyyToISO = (s?: string | null): string | null => {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Aceptar también formato ISO ya correcto
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return s.trim();
  return null;
};

/** "YYYY-MM-DD" → "DD/MM/YYYY"  (para la interfaz Empadronado del frontend) */
const isoToDDMMYYYY = (s?: string | null): string => {
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

// =============================================================================
// 2. TIPO DE FILA DE SUPABASE (snake_case)
// =============================================================================

/** Refleja exactamente las columnas de public.empadronados */
type SupabaseRow = {
  id: string;
  numero_padron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  miembros_familia: unknown[];
  vehiculos: unknown[];
  telefonos: unknown[];
  habilitado: boolean;
  anulado: boolean;
  observaciones: string | null;
  fecha_ingreso: string | null;
  manzana: string | null;
  lote: string | null;
  etapa: string | null;
  genero: string;
  vive: boolean;
  estado_vivienda: string;
  cumpleanos: string | null;
  created_at: string;
  updated_at: string;
  creado_por: string | null;
  modificado_por: string | null;
  auth_uid: string | null;
  email_acceso: string | null;
};

// =============================================================================
// 3. MAPPERS  DB ↔ DOMINIO
// =============================================================================

/** Fila de Supabase (snake_case) → Empadronado (camelCase) */
const fromRow = (row: SupabaseRow): Empadronado => ({
  id:              row.id,
  numeroPadron:    row.numero_padron,
  nombre:          row.nombre,
  apellidos:       row.apellidos,
  dni:             row.dni,
  familia:         row.familia,
  miembrosFamilia: (row.miembros_familia as any[]) ?? [],
  vehiculos:       (row.vehiculos as any[]) ?? [],
  telefonos:       (row.telefonos as any[]) ?? [],
  habilitado:      row.habilitado,
  anulado:         row.anulado ?? false,
  observaciones:   row.observaciones ?? undefined,
  fechaIngreso:    row.fecha_ingreso ? new Date(row.fecha_ingreso).getTime() : 0,
  manzana:         row.manzana ?? undefined,
  lote:            row.lote ?? undefined,
  etapa:           row.etapa ?? undefined,
  genero:          row.genero as "masculino" | "femenino",
  vive:            row.vive,
  estadoVivienda:  row.estado_vivienda as "construida" | "construccion" | "terreno",
  cumpleanos:      isoToDDMMYYYY(row.cumpleanos),
  createdAt:       new Date(row.created_at).getTime(),
  updatedAt:       new Date(row.updated_at).getTime(),
  creadoPor:       row.creado_por ?? "",
  modificadoPor:   row.modificado_por ?? undefined,
  authUid:         row.auth_uid ?? undefined,
  emailAcceso:     row.email_acceso ?? undefined,
});

/** Formulario camelCase → objeto parcial snake_case para Supabase */
const toRow = (
  data: CreateEmpadronadoForm | UpdateEmpadronadoForm
): Record<string, unknown> => {
  const row: Record<string, unknown> = {};

  if (data.numeroPadron  !== undefined) row.numero_padron    = data.numeroPadron;
  if (data.nombre        !== undefined) row.nombre           = data.nombre;
  if (data.apellidos     !== undefined) row.apellidos        = data.apellidos;
  if (data.dni           !== undefined) row.dni              = data.dni;
  if (data.familia       !== undefined) row.familia          = data.familia;
  if (data.habilitado    !== undefined) row.habilitado       = data.habilitado;
  if (data.observaciones !== undefined) row.observaciones    = data.observaciones ?? null;
  if (data.manzana       !== undefined) row.manzana          = data.manzana ?? null;
  if (data.lote          !== undefined) row.lote             = data.lote ?? null;
  if (data.etapa         !== undefined) row.etapa            = data.etapa ?? null;
  if (data.genero        !== undefined) row.genero           = data.genero;
  if (data.vive          !== undefined) row.vive             = data.vive;
  if (data.estadoVivienda !== undefined) row.estado_vivienda = data.estadoVivienda;

  if (data.miembrosFamilia !== undefined) row.miembros_familia = data.miembrosFamilia ?? [];
  if (data.vehiculos       !== undefined) row.vehiculos        = data.vehiculos ?? [];
  if (data.telefonos       !== undefined) row.telefonos        = data.telefonos ?? [];

  if (data.fechaIngreso !== undefined) {
    row.fecha_ingreso = data.fechaIngreso
      ? new Date(data.fechaIngreso).toISOString()
      : null;
  }

  if (data.cumpleanos !== undefined) {
    row.cumpleanos = ddmmyyyyToISO(data.cumpleanos);
  }

  return row;
};

// =============================================================================
// 4. HELPERS DE PERÍODOS / COBRANZAS  (solo usados internamente)
// =============================================================================

const pad2 = (n: number) => String(n).padStart(2, "0");
const periodKeyFromDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const compact = (period: string) => period.replace("-", "");
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

const POLICY_START = ymd(2025, 1, 15);
const CHARGES_PATH = "cobranzas/charges";
const PERIODS_LOCK_PATH = "cobranzas/periods";

// =============================================================================
// 5. CONFIG DE COBRANZAS  (sigue en Firebase hasta migrar cobranzas)
// =============================================================================

export type CobranzasConfig = {
  montoMensual: number;
  diaVencimiento: number;
  diaCierreMes: number;
};

export const getCobranzasConfig = async (): Promise<CobranzasConfig> => {
  const snap = await get(ref(db, "cobranzas/configuracion"));
  const cfg = (snap.exists() ? snap.val() : {}) as any;
  return {
    montoMensual:   Number(cfg?.montoMensual ?? 50),
    diaVencimiento: Number(cfg?.diaVencimiento ?? 15),
    diaCierreMes:   Number(cfg?.diaCierre ?? 14),
  };
};

/** Primer "YYYY-MM" a cobrar según política y fecha de ingreso */
const firstChargePeriodForEmp = async (emp: Empadronado): Promise<string> => {
  const { diaCierreMes } = await getCobranzasConfig();
  const ingresoDate = new Date(emp.fechaIngreso || 0);

  if (!emp.fechaIngreso || ingresoDate < POLICY_START) return "2025-01";

  const y = ingresoDate.getFullYear();
  const m = ingresoDate.getMonth() + 1;
  const d = ingresoDate.getDate();

  if (d <= diaCierreMes) return `${y}-${pad2(m)}`;
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
};

// =============================================================================
// 6. GENERACIÓN DE CHARGES (escribe en Firebase RTDB)
// =============================================================================

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
    const alreadyMonthly = Object.values<any>(vals).some((c) => !("quincena" in c));
    if (alreadyMonthly) return false;
  }

  const chargeRef = push(ref(db, node));
  await set(chargeRef, {
    empadronadoId: emp.id,
    numeroPadron:  emp.numeroPadron || "",
    periodo:       period,
    vencimiento:   fechaVenc,
    montoBase:     montoMensual,
    descuentos:    [],
    recargos:      [],
    total:         montoMensual,
    saldo:         montoMensual,
    estado:        "pendiente",
    timestamps: {
      creado:      new Date().toISOString(),
      actualizado: new Date().toISOString(),
    },
  });

  return true;
};

/** Genera cuotas desde el primer período válido hasta el mes actual */
export const ensureChargesForNewMember = async (
  empId: string,
  _ignored?: string,
  authorUid: string = "system"
): Promise<number> => {
  // Lee el empadronado desde Supabase (ya migrado)
  const emp = await getEmpadronado(empId);
  if (!emp) return 0;

  const first = await firstChargePeriodForEmp(emp);
  const last  = periodKeyFromDate(new Date());
  const diff  = monthsBetween(first, last);

  let created = 0;
  for (let i = 0; i <= diff; i++) {
    const p  = addMonths(first, i);
    const ok = await ensureChargeForMemberPeriod(
      { id: empId, numeroPadron: emp.numeroPadron },
      p,
      authorUid
    );
    if (ok) created++;
  }
  return created;
};

/** Backfill de charges para todos los empadronados activos */
export const backfillChargesForAllEmpadronados = async (
  _ignored?: string,
  authorUid: string = "system"
): Promise<number> => {
  const empadronados = await getEmpadronados();
  let total = 0;

  for (const emp of empadronados) {
    if (emp.habilitado === false || emp.anulado === true) continue;
    total += await ensureChargesForNewMember(emp.id, undefined, authorUid);
  }

  return total;
};

/** Genera solo la cuota del mes actual para todos (sin duplicar) */
export const ensureCurrentMonthChargesForAll = async (
  authorUid: string = "system"
): Promise<number> => {
  const period    = periodKeyFromDate(new Date());
  const yyyymm    = compact(period);
  const periodLock = ref(db, `${PERIODS_LOCK_PATH}/${yyyymm}/generated`);

  const tx = await runTransaction(periodLock, (cur) => (cur ? cur : { at: Date.now() }));
  if (!tx.committed) return 0;

  const empadronados = await getEmpadronados();
  let created = 0;

  for (const emp of empadronados) {
    if (emp.habilitado === false || emp.anulado === true) continue;
    const ok = await ensureChargeForMemberPeriod(
      { id: emp.id, numeroPadron: emp.numeroPadron },
      period,
      authorUid
    );
    if (ok) created++;
  }
  return created;
};

// =============================================================================
// 7. HERRAMIENTAS LEGACY  (cobranzas/pagos — siguen en Firebase)
// =============================================================================

export const dedupePagosForAll = async (): Promise<{ kept: number; removed: number }> => {
  const pagosSnap = await get(ref(db, "cobranzas/pagos"));
  if (!pagosSnap.exists()) return { kept: 0, removed: 0 };

  const all = pagosSnap.val() as Record<
    string,
    { empadronadoId: string; año: number; mes: number }
  >;

  const seen = new Map<string, string>();
  let kept = 0;
  let removed = 0;

  await remove(ref(db, "cobranzas/pagos_index"));

  for (const [pagoId, p] of Object.entries(all)) {
    const key = `${p.empadronadoId}:${p.año}${pad2(p.mes)}`;
    if (!seen.has(key)) {
      seen.set(key, pagoId);
      kept++;
      await set(
        ref(db, `cobranzas/pagos_index/${p.empadronadoId}/${p.año}${pad2(p.mes)}`),
        { createdAt: Date.now() }
      );
    } else {
      await remove(ref(db, `cobranzas/pagos/${pagoId}`));
      removed++;
    }
  }
  return { kept, removed };
};

export const reconcilePagosForAll = async (
  authorUid: string = "system"
): Promise<{
  totalEmp: number;
  removedOutOfRange: number;
  removedDuplicates: number;
  createdMissing: number;
}> => {
  const empadronados = await getEmpadronados();
  if (!empadronados.length) {
    return { totalEmp: 0, removedOutOfRange: 0, removedDuplicates: 0, createdMissing: 0 };
  }

  const pagosSnap = await get(ref(db, "cobranzas/pagos"));
  const allPagos: Record<string, any> = pagosSnap.exists() ? pagosSnap.val() : {};

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
  let createdMissing    = 0;
  let totalEmp          = 0;

  await remove(ref(db, "cobranzas/pagos_index"));

  for (const emp of empadronados) {
    if (emp.habilitado === false || emp.anulado === true) continue;
    totalEmp++;

    const first = await firstChargePeriodForEmp(emp);
    const diff  = monthsBetween(first, last);
    const validPeriods = new Set<string>();
    for (let i = 0; i <= diff; i++) validPeriods.add(addMonths(first, i));

    const pagos = byEmp.get(emp.id) ?? [];
    const seen  = new Set<string>();

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
      await set(ref(db, `cobranzas/pagos_index/${emp.id}/${compact(period)}`), {
        createdAt: Date.now(),
      });
    }

    for (const period of validPeriods) {
      if (!seen.has(period)) {
        const ok = await ensureChargeForMemberPeriod(
          { id: emp.id, numeroPadron: emp.numeroPadron },
          period,
          authorUid
        );
        if (ok) createdMissing++;
      }
    }
  }

  return { totalEmp, removedOutOfRange, removedDuplicates, createdMissing };
};

// =============================================================================
// 8. VINCULACIÓN CON AUTH  →  Supabase
// =============================================================================

export const linkAuthToEmpadronado = async (
  empadronadoId: string,
  uid: string,
  email: string
) => {
  const { error } = await supabase
    .from("empadronados")
    .update({ auth_uid: uid, email_acceso: email })
    .eq("id", empadronadoId);

  if (error) throw error;
};

export const unlinkAuthFromEmpadronado = async (empadronadoId: string) => {
  const { error } = await supabase
    .from("empadronados")
    .update({ auth_uid: null, email_acceso: null })
    .eq("id", empadronadoId);

  if (error) throw error;
};

// =============================================================================
// 9. BÚSQUEDA DIRECTA  →  Supabase
// =============================================================================

export const findEmpadronadoByDniOrPadron = async (
  term: string
): Promise<Empadronado | null> => {
  const t = (term || "").trim();
  if (!t) return null;

  // 1) Por número de padrón
  const { data: byPadron } = await supabase
    .from("empadronados")
    .select("*")
    .eq("numero_padron", t)
    .maybeSingle();

  if (byPadron) return fromRow(byPadron as SupabaseRow);

  // 2) Por DNI
  const { data: byDni } = await supabase
    .from("empadronados")
    .select("*")
    .eq("dni", t)
    .maybeSingle();

  return byDni ? fromRow(byDni as SupabaseRow) : null;
};

// =============================================================================
// 10. CRUD  →  Supabase
// =============================================================================

export const createEmpadronado = async (
  data: CreateEmpadronadoForm,
  actorUid: string
): Promise<string | null> => {
  try {
    const row = {
      ...toRow(data),
      // creado_por/modificado_por son UUID FK a auth.users;
      // se asignan solo si actorUid es un UUID válido de Supabase Auth.
    };

    const { data: inserted, error } = await supabase
      .from("empadronados")
      .insert([row])
      .select()
      .single();

    if (error || !inserted) {
      console.error("Error creating empadronado:", error);
      return null;
    }

    const newId = (inserted as SupabaseRow).id;

    // Genera charges mensuales en Firebase (cobranzas aún no migradas)
    await ensureChargesForNewMember(newId, undefined, actorUid);

    await writeAuditLog({
      actorUid,
      accion: "crear_empadronado",
      moduloId: "empadronados",
      new: { id: newId, numeroPadron: data.numeroPadron },
    });

    return newId;
  } catch (error) {
    console.error("Error creating empadronado:", error);
    return null;
  }
};

export const getEmpadronados = async (): Promise<Empadronado[]> => {
  try {
    const { data, error } = await supabase
      .from("empadronados")
      .select("*")
      .order("numero_padron", { ascending: true });

    if (error) {
      console.error("Error getting empadronados:", error);
      return [];
    }

    return (data as SupabaseRow[]).map(fromRow);
  } catch (error) {
    console.error("Error getting empadronados:", error);
    return [];
  }
};

export const getEmpadronado = async (id: string): Promise<Empadronado | null> => {
  try {
    const { data, error } = await supabase
      .from("empadronados")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error getting empadronado:", error);
      return null;
    }

    return data ? fromRow(data as SupabaseRow) : null;
  } catch (error) {
    console.error("Error getting empadronado:", error);
    return null;
  }
};

// Alias mantenido para compatibilidad con componentes existentes
export const getEmpadronadoById = getEmpadronado;

export const updateEmpadronado = async (
  id: string,
  updates: UpdateEmpadronadoForm,
  actorUid: string
): Promise<boolean> => {
  try {
    const oldData = await getEmpadronado(id);
    if (!oldData) return false;

    // Excluir campos de documentos base64 (no se guardan en Supabase por tamaño)
    const {
      documentoDniFrontal,
      documentoDniReverso,
      documentoReciboLuz,
      ...cleanUpdates
    } = updates as any;

    const row = toRow(cleanUpdates);
    if (Object.keys(row).length === 0) return true;

    const { error } = await supabase
      .from("empadronados")
      .update(row)
      .eq("id", id);

    if (error) {
      console.error("Error updating empadronado:", error);
      return false;
    }

    // Log de auditoría (solo campos que cambiaron, sin documentos)
    const logFields: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      if (!k.startsWith("documento")) logFields[k] = row[k];
    });

    await writeAuditLog({
      actorUid,
      targetUid: id,
      accion: "actualizar_empadronado",
      moduloId: "empadronados",
      old: {
        id: oldData.id,
        numeroPadron: oldData.numeroPadron,
        nombre: oldData.nombre,
      },
      new: logFields,
    });

    return true;
  } catch (error) {
    console.error("Error updating empadronado:", error);
    return false;
  }
};

export const deleteEmpadronado = async (
  id: string,
  actorUid: string,
  motivo: string
): Promise<boolean> => {
  try {
    const oldData = await getEmpadronado(id);
    if (!oldData) return false;

    const { error } = await supabase
      .from("empadronados")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting empadronado:", error);
      return false;
    }

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
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return getEmpadronados();

    // Búsqueda server-side por campos de texto indexables
    const { data, error } = await supabase
      .from("empadronados")
      .select("*")
      .or(
        `nombre.ilike.%${term}%,` +
        `apellidos.ilike.%${term}%,` +
        `numero_padron.ilike.%${term}%,` +
        `dni.ilike.%${term}%`
      )
      .order("numero_padron", { ascending: true });

    if (error) {
      console.error("Error searching empadronados:", error);
      return [];
    }

    const results = (data as SupabaseRow[]).map(fromRow);

    // Búsqueda adicional en miembros_familia (campo JSONB — no indexado en ilike)
    const hayMiembros = results.length === 0;
    if (hayMiembros) {
      // Fallback: traer todos y filtrar en cliente (solo si no hubo resultados de texto)
      const todos = await getEmpadronados();
      return todos.filter((e) =>
        Array.isArray(e.miembrosFamilia) &&
        e.miembrosFamilia.some(
          (m: any) =>
            String(m?.nombre || "").toLowerCase().includes(term) ||
            String(m?.apellidos || "").toLowerCase().includes(term)
        )
      );
    }

    return results;
  } catch (error) {
    console.error("Error searching empadronados:", error);
    return [];
  }
};

export const getEmpadronadosStats = async (): Promise<EmpadronadosStats> => {
  try {
    const empadronados = await getEmpadronados();
    return {
      total:       empadronados.length,
      viven:       empadronados.filter((e) => !!e.vive).length,
      construida:  empadronados.filter((e) => e.estadoVivienda === "construida").length,
      construccion: empadronados.filter((e) => e.estadoVivienda === "construccion").length,
      terreno:     empadronados.filter((e) => e.estadoVivienda === "terreno").length,
      masculinos:  empadronados.filter((e) => e.genero === "masculino").length,
      femeninos:   empadronados.filter((e) => e.genero === "femenino").length,
      habilitados: empadronados.filter((e) => !!e.habilitado).length,
    };
  } catch {
    return {
      total: 0, viven: 0, construida: 0, construccion: 0,
      terreno: 0, masculinos: 0, femeninos: 0, habilitados: 0,
    };
  }
};

export const isNumeroPadronUnique = async (
  numeroPadron: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    let query = supabase
      .from("empadronados")
      .select("id")
      .eq("numero_padron", numeroPadron);

    if (excludeId) query = query.neq("id", excludeId);

    const { data, error } = await query;
    if (error) return false;
    return !data || data.length === 0;
  } catch (error) {
    console.error("Error checking numero padron:", error);
    return false;
  }
};

export const obtenerEmpadronadoPorAuthUid = async (
  authUid: string
): Promise<Empadronado | null> => {
  try {
    const { data, error } = await supabase
      .from("empadronados")
      .select("*")
      .eq("auth_uid", authUid)
      .maybeSingle();

    if (error) {
      console.error("Error getting empadronado by authUid:", error);
      return null;
    }

    return data ? fromRow(data as SupabaseRow) : null;
  } catch (error) {
    console.error("Error getting empadronado by authUid:", error);
    return null;
  }
};

/** Anula un padrón (marca como "fantasma") — no lo elimina */
export const anularPadron = async (
  id: string,
  actorUid: string,
  motivo: string
): Promise<boolean> => {
  try {
    const oldData = await getEmpadronado(id);
    if (!oldData) return false;

    const nuevaObs = oldData.observaciones
      ? `${oldData.observaciones} | ANULADO: ${motivo}`
      : `ANULADO: ${motivo}`;

    const { error } = await supabase
      .from("empadronados")
      .update({
        anulado:      true,
        habilitado:   false,
        observaciones: nuevaObs,
      })
      .eq("id", id);

    if (error) {
      console.error("Error anulando padrón:", error);
      return false;
    }

    await writeAuditLog({
      actorUid,
      targetUid: id,
      accion: "anular_padron",
      moduloId: "empadronados",
      old: oldData,
      new: { motivo },
    });

    return true;
  } catch (error) {
    console.error("Error anulando padrón:", error);
    return false;
  }
};
