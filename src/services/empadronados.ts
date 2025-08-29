import {
  ref,
  push,
  set,
  update,
  remove,
  get,
  runTransaction,
} from 'firebase/database';
import { db } from '@/config/firebase';
import {
  Empadronado,
  CreateEmpadronadoForm,
  UpdateEmpadronadoForm,
  EmpadronadosStats,
} from '@/types/empadronados';
import { Pago } from '@/types/cobranzas';
import { writeAuditLog } from './rtdb';

const EMPADRONADOS_PATH = 'empadronados';

/* ──────────────────────────────────────────────────────────────
   Helpers de periodos / fechas
   ────────────────────────────────────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, '0');
const periodKeyFromDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // 2025-09
const compact = (period: string) => period.replace('-', ''); // 2025-09 -> 202509
const addMonths = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const base = new Date(y, m - 1 + n, 1);
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}`;
};
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

// Inicio histórico: enero 2025
const START_PERIOD = '2025-01';

/* ──────────────────────────────────────────────────────────────
   Config de cobranzas (usa tu nodo real de config)
   ────────────────────────────────────────────────────────────── */
const getCobranzasConfig = async (): Promise<{ montoMensual: number; diaVencimiento: number }> => {
  // En tu servicio de cobranzas usas `cobranzas/configuracion`
  const snap = await get(ref(db, 'cobranzas/configuracion'));
  if (!snap.exists()) {
    // Default razonables si no hay config
    return { montoMensual: 50, diaVencimiento: 15 };
  }
  const cfg = snap.val() as any;
  return {
    montoMensual: Number(cfg.montoMensual ?? 50),
    diaVencimiento: Number(cfg.diaVencimiento ?? 15),
  };
};

/* ──────────────────────────────────────────────────────────────
   Alta de PAGOS (compatibles con tu UI)
   - Se guardan en: cobranzas/pagos (plano) con campos de Pago
   - Se evita duplicado con un índice: cobranzas/pagos_index/{empId}/{YYYYMM}
   ────────────────────────────────────────────────────────────── */
const ensurePagoForMemberPeriod = async (
  emp: Pick<Empadronado, 'id' | 'numeroPadron'>,
  period: string,
  authorUid: string = 'system'
) => {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const yyyymm = compact(period);

  // índice de unicidad por empadronado+periodo
  const lockRef = ref(db, `cobranzas/pagos_index/${emp.id}/${yyyymm}`);
  const tx = await runTransaction(lockRef, (cur) => (cur ? cur : { createdAt: Date.now() }));
  if (!tx.committed) return false; // ya existía

  const { montoMensual, diaVencimiento } = await getCobranzasConfig();
  const fechaVenc = new Date(y, m - 1, diaVencimiento).toLocaleDateString('es-PE');

  // Crear pago compatible con tu UI
  const pagosRef = ref(db, 'cobranzas/pagos');
  const pagoRef = push(pagosRef);
  const nuevo: Pago = {
    id: pagoRef.key!,
    empadronadoId: emp.id,
    numeroPadron: emp.numeroPadron || '',
    mes: m,
    año: y,
    monto: montoMensual,
    montoOriginal: montoMensual,
    fechaVencimiento: fechaVenc,
    estado: 'pendiente', // pendiente hasta que registren pago
    descuentos: [],
    recargos: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creadoPor: authorUid,
    // campos opcionales de tu tipo Pago se ignoran si no existen
  };

  await set(pagoRef, nuevo);
  return true;
};

// Genera TODAS las cuotas (PAGOS) desde START_PERIOD hasta el mes actual para un empadronado
export const ensureChargesForNewMember = async (
  empId: string,
  startPeriod: string = START_PERIOD,
  authorUid: string = 'system'
) => {
  // Necesitamos numeroPadron para la UI
  const empSnap = await get(ref(db, `${EMPADRONADOS_PATH}/${empId}`));
  if (!empSnap.exists()) return 0;
  const emp = empSnap.val() as Empadronado;

  const today = new Date();
  const last = periodKeyFromDate(today);
  const diff = monthsBetween(startPeriod, last);

  let created = 0;
  for (let i = 0; i <= diff; i++) {
    const p = addMonths(startPeriod, i);
    const ok = await ensurePagoForMemberPeriod({ id: empId, numeroPadron: emp.numeroPadron }, p, authorUid);
    if (ok) created++;
  }
  return created;
};

// Backfill para TODOS los empadronados existentes (ejecutar una sola vez)
export const backfillChargesForAllEmpadronados = async (
  startPeriod: string = START_PERIOD,
  authorUid: string = 'system'
) => {
  const snap = await get(ref(db, EMPADRONADOS_PATH));
  if (!snap.exists()) return 0;

  const data = snap.val() as Record<string, Empadronado>;
  let total = 0;

  for (const empId of Object.keys(data)) {
    const emp = data[empId];
    // Generar solo para habilitados (ajusta a tu política)
    if (emp?.habilitado === false) continue;
    total += await ensureChargesForNewMember(empId, startPeriod, authorUid);
  }
  return total;
};

// Asegura solo la cuota del MES ACTUAL (evita duplicados por transacción)
export const ensureCurrentMonthChargesForAll = async (authorUid: string = 'system') => {
  const period = periodKeyFromDate(new Date());
  const yyyymm = compact(period);
  const periodLock = ref(db, `cobranzas/periods/${yyyymm}/generated`);

  const tx = await runTransaction(periodLock, (cur) => (cur ? cur : { at: Date.now() }));
  if (!tx.committed) return 0; // ya se generó

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
   Util: eliminar valores undefined
   ────────────────────────────────────────────────────────────── */
const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(removeUndefined).filter((item) => item !== undefined);
  if (obj !== null && typeof obj === 'object') {
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
   CRUD Empadronados
   ────────────────────────────────────────────────────────────── */

// Crear empadronado → AUTOGENERA pagos desde 2025-01
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

    const cleanData = removeUndefined(empadronado);
    await set(empadronadoRef, cleanData);

    // Genera automáticamente TODAS las cuotas desde ENERO-2025 si está habilitado
    if (cleanData.habilitado !== false) {
      await ensureChargesForNewMember(id, START_PERIOD, actorUid);
    }

    await writeAuditLog({
      actorUid,
      accion: 'crear_empadronado',
      moduloId: 'empadronados',
      new: empadronado,
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
    return snapshot.exists() ? (snapshot.val() as Empadronado) : null;
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
      modificadoPor: actorUid,
    };

    await update(ref(db, `${EMPADRONADOS_PATH}/${id}`), updateData);

    await writeAuditLog({
      actorUid,
      targetUid: id,
      accion: 'actualizar_empadronado',
      moduloId: 'empadronados',
      old: oldData,
      new: { ...oldData, ...updateData },
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
      new: { motivo },
    });

    return true;
  } catch (error) {
    console.error('Error deleting empadronado:', error);
    return false;
  }
};

// Buscar empadronados
export const searchEmpadronados = async (searchTerm: string): Promise<Empadronado[]> => {
  try {
    const empadronados = await getEmpadronados();
    const term = searchTerm.toLowerCase();

    return empadronados.filter(
      (e) =>
        e.nombre.toLowerCase().includes(term) ||
        e.apellidos.toLowerCase().includes(term) ||
        e.numeroPadron.toLowerCase().includes(term) ||
        e.dni.toLowerCase().includes(term) ||
        (e.miembrosFamilia &&
          e.miembrosFamilia.some(
            (miembro) =>
              miembro.nombre.toLowerCase().includes(term) ||
              miembro.apellidos.toLowerCase().includes(term)
          ))
    );
  } catch (error) {
    console.error('Error searching empadronados:', error);
    return [];
  }
};

// Estadísticas simples
export const getEmpadronadosStats = async (): Promise<EmpadronadosStats> => {
  try {
    const empadronados = await getEmpadronados();

    return {
      total: empadronados.length,
      viven: empadronados.filter((e) => e.vive).length,
      construida: empadronados.filter((e) => e.estadoVivienda === 'construida').length,
      construccion: empadronados.filter((e) => e.estadoVivienda === 'construccion').length,
      terreno: empadronados.filter((e) => e.estadoVivienda === 'terreno').length,
      masculinos: empadronados.filter((e) => e.genero === 'masculino').length,
      femeninos: empadronados.filter((e) => e.genero === 'femenino').length,
      habilitados: empadronados.filter((e) => e.habilitado).length,
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
      habilitados: 0,
    };
  }
};

// Unicidad de padrón
export const isNumeroPadronUnique = async (numeroPadron: string, excludeId?: string): Promise<boolean> => {
  try {
    const empadronados = await getEmpadronados();
    return !empadronados.some((e) => e.numeroPadron === numeroPadron && e.id !== excludeId);
  } catch (error) {
    console.error('Error checking numero padron:', error);
    return false;
  }
};
