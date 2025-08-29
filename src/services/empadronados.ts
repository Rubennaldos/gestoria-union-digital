import {
  ref,
  push,
  set,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
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
import { writeAuditLog } from './rtdb';

const EMPADRONADOS_PATH = 'empadronados';

/* ──────────────────────────────────────────────────────────────
   Helpers de periodos y config de finanzas
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

// Enero 2025 como inicio
const START_PERIOD = '2025-01';

// Lee monto de cuota desde config (fallback S/50)
const getCuotaConfig = async (): Promise<{ montoCuota: number }> => {
  const snap = await get(ref(db, 'config/finanzas/montoCuota'));
  const monto = snap.exists() ? Number(snap.val()) : 50;
  return { montoCuota: Number.isFinite(monto) ? monto : 50 };
};

// Crea 1 cargo si NO existe aún para (empId, periodo)
const ensureChargeForMemberPeriod = async (empId: string, period: string) => {
  const node = `cobranzas/charges/${compact(period)}/${empId}`;
  const exist = await get(ref(db, node));
  if (exist.exists()) return false; // ya existe algo para ese periodo

  const { montoCuota } = await getCuotaConfig();
  const chargeId = push(ref(db, node)).key!;
  await set(ref(db, `${node}/${chargeId}`), {
    concepto: 'Cuota mensual',
    periodo: period,            // ej: 2025-08
    montoBase: montoCuota,      // 50 por defecto o lo que esté en config
    descuentos: null,
    recargos: null,
    total: montoCuota,
    saldo: montoCuota,
    estado: 'pendiente',        // pendiente hasta que registre pago
    timestamps: {
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
    },
  });
  return true;
};

// Genera TODAS las cuotas desde START_PERIOD hasta el mes actual para un empadronado
export const ensureChargesForNewMember = async (
  empId: string,
  startPeriod: string = START_PERIOD
) => {
  const today = new Date();
  const last = periodKeyFromDate(today);
  const diff = monthsBetween(startPeriod, last);

  let created = 0;
  for (let i = 0; i <= diff; i++) {
    const p = addMonths(startPeriod, i);
    const ok = await ensureChargeForMemberPeriod(empId, p);
    if (ok) created++;
  }
  return created;
};

// Backfill para TODOS los empadronados existentes (ejecutar una sola vez si ya tenías datos)
export const backfillChargesForAllEmpadronados = async (startPeriod: string = START_PERIOD) => {
  const snap = await get(ref(db, EMPADRONADOS_PATH));
  if (!snap.exists()) return 0;

  const data = snap.val() as Record<string, Empadronado>;
  let total = 0;

  for (const empId of Object.keys(data)) {
    const emp = data[empId];
    // Solo generamos para habilitados por defecto (ajusta si quieres otro criterio)
    if (emp?.habilitado === false) continue;
    total += await ensureChargesForNewMember(empId, startPeriod);
  }
  return total;
};

// Seguro mensual (opcional): genera la cuota del MES ACTUAL una sola vez para todos
export const ensureCurrentMonthChargesForAll = async () => {
  const period = periodKeyFromDate(new Date());
  const lockRef = ref(db, `cobranzas/periods/${compact(period)}/generated`);

  // Transacción para evitar duplicados si 2 usuarios abren a la vez
  const tx = await runTransaction(lockRef, (cur) => (cur ? cur : true));
  if (!tx.committed) return 0; // ya estaba generado

  const snap = await get(ref(db, EMPADRONADOS_PATH));
  if (!snap.exists()) return 0;

  const data = snap.val() as Record<string, Empadronado>;
  let created = 0;

  for (const empId of Object.keys(data)) {
    const emp = data[empId];
    if (emp?.habilitado === false) continue;
    const ok = await ensureChargeForMemberPeriod(empId, period);
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

// Crear nuevo empadronado (AUTO-genera deuda desde 2025-01)
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

    // 🔹 Genera automáticamente TODAS las cuotas desde ENERO-2025
    //    (puedes cambiar el criterio: solo si está habilitado, etc.)
    const debeGenerar = cleanData.habilitado !== false; // por defecto sí
    if (debeGenerar) {
      await ensureChargesForNewMember(id, START_PERIOD);
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

// Buscar empadronados por nombre o número de padrón
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

// Obtener estadísticas
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

// Verificar si un número de padrón ya existe
export const isNumeroPadronUnique = async (numeroPadron: string, excludeId?: string): Promise<boolean> => {
  try {
    const empadronados = await getEmpadronados();
    return !empadronados.some((e) => e.numeroPadron === numeroPadron && e.id !== excludeId);
  } catch (error) {
    console.error('Error checking numero padron:', error);
    return false;
  }
};
