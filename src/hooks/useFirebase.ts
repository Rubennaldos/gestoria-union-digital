import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  get,
  runTransaction,
} from 'firebase/database';

/* =========================================================
   HOOKS BÁSICOS (lectura y escritura) - corregidos
   ========================================================= */

// Lectura reactiva desde RTDB
export const useFirebaseData = <T,>(path: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataRef = ref(db, path);

    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        setLoading(false);
        setError(null);
        setData(snapshot.val());
      },
      (err) => {
        setLoading(false);
        setError(err.message);
        console.error('Firebase error:', err);
      }
    );

    return () => unsubscribe();
  }, [path]);

  return { data, loading, error };
};

// Escritura/actualización en RTDB
export const useFirebaseWrite = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const writeData = async (path: string, data: any) => {
    setLoading(true); setError(null);
    try {
      await set(ref(db, path), data);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const updateData = async (path: string, updates: any) => {
    setLoading(true); setError(null);
    try {
      await update(ref(db, path), updates);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  const pushData = async (path: string, data: any) => {
    setLoading(true); setError(null);
    try {
      const newRef = await push(ref(db, path), data);
      setLoading(false);
      return newRef.key;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  const deleteData = async (path: string) => {
    setLoading(true); setError(null);
    try {
      await remove(ref(db, path));
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  };

  return { writeData, updateData, pushData, deleteData, loading, error };
};

/* =========================================================
   UTILIDADES DE COBRANZAS (RTDB)
   Estructura propuesta:
   - config/finanzas
   - padron/{empId}
   - cobranzas/charges/{YYYYMM}/{empId}/{chargeId}
   - cobranzas/cierres/{YYYYMM}
   ========================================================= */

// ---- Helpers de periodo ----
const pad2 = (n: number) => String(n).padStart(2, '0');
const periodKeyFromDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // 2025-09
const compact = (period: string) => period.replace('-', ''); // 2025-09 -> 202509

const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

const addMonths = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const base = new Date(y, m - 1 + n, 1);
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}`;
};

// ---- Config financiera (con defaults seguros) ----
type FinanzasConfig = {
  montoCuota: number;
  prontoPago: { activo: boolean; descuentoPct: number; dias: number[] };
  morosidad: { activo: boolean; tasaPctMensual: number; desdeDia: number };
};

const getCuotaConfig = async (): Promise<FinanzasConfig> => {
  const snap = await get(ref(db, 'config/finanzas'));
  const base = snap.exists() ? snap.val() : {};
  return {
    montoCuota: base?.montoCuota ?? 50,
    prontoPago: base?.prontoPago ?? { activo: true, descuentoPct: 10, dias: [1, 2, 3] },
    morosidad: base?.morosidad ?? { activo: true, tasaPctMensual: 5, desdeDia: 16 },
  };
};

// ---- Generar cargos de un periodo para todos los empadronados ----
export const generateChargesForPeriod = async (period: string) => {
  const { montoCuota } = await getCuotaConfig();
  const padrSnap = await get(ref(db, 'padron'));
  if (!padrSnap.exists()) return 0;

  const padron = padrSnap.val(); // {empId: {...}}
  let created = 0;

  for (const empId of Object.keys(padron)) {
    const activo = padron[empId]?.activo ?? true;
    if (!activo) continue;

    const periodPath = `cobranzas/charges/${compact(period)}/${empId}`;
    const existing = await get(ref(db, periodPath));
    if (existing.exists()) continue; // ya creado

    const chargeId = push(ref(db, periodPath)).key!;
    await set(ref(db, `${periodPath}/${chargeId}`), {
      concepto: 'Cuota mensual',
      periodo: period,
      montoBase: montoCuota,
      descuentos: null,
      recargos: null,
      total: montoCuota,
      saldo: montoCuota,
      estado: 'pendiente',
      timestamps: { creado: new Date().toISOString(), actualizado: new Date().toISOString() },
    });
    created++;
  }

  return created;
};

// ---- Generar cargos desde un inicio (incluye el mes actual) ----
export const generateChargesFrom = async (startPeriod = '2025-01') => {
  const today = new Date();
  const lastPeriod = periodKeyFromDate(today);
  const diff = monthsBetween(startPeriod, lastPeriod);

  let total = 0;
  for (let i = 0; i <= diff; i++) {
    const p = addMonths(startPeriod, i);
    total += await generateChargesForPeriod(p);
  }
  return total;
};

// ---- Resumen de deuda por asociado ----
export const getMemberDebtSummary = async (empId: string, startPeriod = '2025-01') => {
  const today = new Date();
  const last = periodKeyFromDate(today);
  const diff = monthsBetween(startPeriod, last);

  let total = 0;
  let moroso = false;
  const items: Array<{ periodo: string; saldo: number; estado: string }> = [];

  for (let i = 0; i <= diff; i++) {
    const p = addMonths(startPeriod, i);
    const path = `cobranzas/charges/${compact(p)}/${empId}`;
    const snap = await get(ref(db, path));
    if (!snap.exists()) continue;

    const charges = snap.val();
    for (const cid of Object.keys(charges)) {
      const c = charges[cid];
      const saldo = Number(c?.saldo ?? 0);
      const estado = c?.estado ?? 'pendiente';
      
      if (estado === 'pendiente') {
        total += saldo;
        items.push({ periodo: p, saldo, estado });

        // Verificar si es moroso
        const [py, pm] = p.split('-').map(Number);
        const isPast = py < today.getFullYear() || (py === today.getFullYear() && pm < today.getMonth() + 1);
        const isThis = py === today.getFullYear() && pm === today.getMonth() + 1;
        if (saldo > 0 && (isPast || (isThis && today.getDate() >= 16))) moroso = true;
      }
    }
  }

  return { total, moroso, items };
};

// ---- Totales del dashboard (recaudado, pendiente, morosos, tasa) ----
export const getCobranzasOverview = async (startPeriod = '2025-01') => {
  const padrSnap = await get(ref(db, 'padron'));
  const padron = padrSnap.exists() ? padrSnap.val() : {};
  const empIds = Object.keys(padron).filter((id) => padron[id]?.activo ?? true);

  const today = new Date();
  const last = periodKeyFromDate(today);
  const diff = monthsBetween(startPeriod, last);

  let recaudado = 0;
  let pendiente = 0;
  let morosos = 0;

  for (const empId of empIds) {
    let saldoEmp = 0;
    let empMoroso = false;

    for (let i = 0; i <= diff; i++) {
      const p = addMonths(startPeriod, i);
      const path = `cobranzas/charges/${compact(p)}/${empId}`;
      const snap = await get(ref(db, path));
      if (!snap.exists()) continue;

      const charges = snap.val();
      for (const cid of Object.keys(charges)) {
        const c = charges[cid];
        const total = Number(c?.total ?? 0);
        const saldo = Number(c?.saldo ?? 0);
        recaudado += total - saldo;
        saldoEmp += saldo;

        const [py, pm] = p.split('-').map(Number);
        const isPast =
          py < today.getFullYear() ||
          (py === today.getFullYear() && pm < today.getMonth() + 1);
        const isThis = py === today.getFullYear() && pm === today.getMonth() + 1;
        if (saldo > 0 && (isPast || (isThis && today.getDate() >= 16))) empMoroso = true;
      }
    }

    pendiente += saldoEmp;
    if (empMoroso) morosos++;
  }

  const tasa = recaudado + pendiente > 0 ? (recaudado / (recaudado + pendiente)) * 100 : 0;

  return {
    recaudado,
    pendiente,
    morosos,
    tasaCobranza: Number(tasa.toFixed(1)),
  };
};

// ---- Cierre de periodo (marcación simple) ----
export const closeCurrentPeriod = async () => {
  const p = periodKeyFromDate(new Date()); // YYYY-MM
  await set(ref(db, `cobranzas/cierres/${compact(p)}`), {
    cerradoPor: 'system',
    fecha: new Date().toISOString(),
  });
  return compact(p);
};
