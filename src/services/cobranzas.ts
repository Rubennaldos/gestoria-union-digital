import { ref, push, set, get, update, remove } from 'firebase/database';
import { db } from '@/config/firebase';
import {
  Pago,
  Egreso,
  Ingreso,                    // ⬅️ nuevo tipo
  ConfiguracionCobranzas,
  EstadisticasCobranzas,
  DeclaracionJurada,
  PlantillaSancion,
} from '@/types/cobranzas';
import { Empadronado } from '@/types/empadronados';

/* ──────────────────────────────────────────────────────────
   Helpers de periodos/fechas
   ────────────────────────────────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, '0');
const periodFromYM = (y: number, m: number) => `${y}-${pad2(m)}`; // "2025-08"
const periodCompact = (period: string) => period.replace('-', ''); // "202508"
const nowPeriod = () => {
  const d = new Date();
  return periodFromYM(d.getFullYear(), d.getMonth() + 1);
};
const addMonths = (period: string, n: number) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return periodFromYM(d.getFullYear(), d.getMonth() + 1);
};
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
};
const toEsDate = (y: number, m: number, day: number) => {
  const d = new Date(y, m - 1, day);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/* ──────────────────────────────────────────────────────────
   Configuración (con defaults)
   ────────────────────────────────────────────────────────── */
export const obtenerConfiguracion = async (): Promise<ConfiguracionCobranzas> => {
  const configRef = ref(db, 'cobranzas/configuracion');
  const snapshot = await get(configRef);

  if (!snapshot.exists()) {
    const configDefault: ConfiguracionCobranzas = {
      montoMensual: 50,
      diaVencimiento: 15,
      diaCierre: 14,
      diasProntoPago: 3,
      porcentajeProntoPago: 10,
      porcentajeMorosidad: 5,
      porcentajeSancion: 10,
      serieComprobantes: 'COB',
      numeroComprobanteActual: 1,
      sede: 'Principal',
    };
    await set(configRef, configDefault);
    return configDefault;
  }

  return snapshot.val() as ConfiguracionCobranzas;
};

export const actualizarConfiguracion = async (config: ConfiguracionCobranzas): Promise<void> => {
  const configRef = ref(db, 'cobranzas/configuracion');
  await set(configRef, config);
};

/* ──────────────────────────────────────────────────────────
   Empadronados (utils)
   ────────────────────────────────────────────────────────── */
const obtenerEmpadronados = async (): Promise<Empadronado[]> => {
  const { getEmpadronados } = await import('@/services/empadronados');
  return await getEmpadronados();
};

const getEmpadronadoById = async (id: string): Promise<Empadronado | null> => {
  const snap = await get(ref(db, `empadronados/${id}`));
  return snap.exists() ? (snap.val() as Empadronado) : null;
};

/* ──────────────────────────────────────────────────────────
   CHARGES: cobranzas/charges/YYYYMM/{empId}/{chargeId}
   ────────────────────────────────────────────────────────── */
const ensureChargeForPeriod = async (emp: Empadronado, period: string) => {
  const cfg = await obtenerConfiguracion();
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const vencStr = toEsDate(y, m, cfg.diaVencimiento);

  const node = `cobranzas/charges/${periodCompact(period)}/${emp.id}`;
  const exist = await get(ref(db, node));
  if (exist.exists()) return false;

  const chargeId = push(ref(db, node)).key!;
  await set(ref(db, `${node}/${chargeId}`), {
    empadronadoId: emp.id,
    numeroPadron: emp.numeroPadron,
    periodo: period,
    vencimiento: vencStr,
    montoBase: cfg.montoMensual,
    descuentos: [],
    recargos: [],
    total: cfg.montoMensual,
    saldo: cfg.montoMensual,
    estado: 'pendiente', // pendiente | pagado | moroso
    timestamps: {
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
    },
  });

  return true;
};

export const ensureChargesForNewMember = async (empId: string, startPeriod = '2025-01') => {
  const emp = await getEmpadronadoById(empId);
  if (!emp) return 0;

  const last = nowPeriod();
  const diff = monthsBetween(startPeriod, last);
  let created = 0;

  for (let i = 0; i <= diff; i++) {
    const p = addMonths(startPeriod, i);
    const ok = await ensureChargeForPeriod(emp, p);
    if (ok) created++;
  }
  return created;
};

const ensureChargesForAllInPeriod = async (period: string) => {
  const padr = await obtenerEmpadronados();
  let created = 0;

  for (const emp of padr) {
    if (emp?.habilitado === false) continue;
    const ok = await ensureChargeForPeriod(emp, period);
    if (ok) created++;
  }
  return created;
};

export const generarPagosDesdeEnero = async (_userUid: string): Promise<void> => {
  const start = '2025-01';
  const last = nowPeriod();
  const diff = monthsBetween(start, last);

  for (let i = 0; i <= diff; i++) {
    const p = addMonths(start, i);
    await ensureChargesForAllInPeriod(p);
  }
};

export const generarPagosMensuales = async (mes: number, año: number, _userUid: string): Promise<void> => {
  const period = periodFromYM(año, mes);
  await ensureChargesForAllInPeriod(period);
};

/* ──────────────────────────────────────────────────────────
   PAGOS (cuotas)
   ────────────────────────────────────────────────────────── */
export const crearPago = async (
  pagoData: Omit<Pago, 'id' | 'createdAt' | 'updatedAt'>,
  userUid: string
): Promise<string> => {
  const cfg = await obtenerConfiguracion();

  const period = periodFromYM(pagoData.año, pagoData.mes);
  const emp = await getEmpadronadoById(pagoData.empadronadoId);
  if (!emp) throw new Error('Empadronado no encontrado');

  await ensureChargeForPeriod(emp, period);

  const chargesNode = `cobranzas/charges/${periodCompact(period)}/${emp.id}`;
  const chargesSnap = await get(ref(db, chargesNode));
  if (!chargesSnap.exists()) throw new Error('Charge no encontrado');

  const charges = chargesSnap.val();
  const chargeId = Object.keys(charges)[0];
  const charge = charges[chargeId];

  // Pronto pago (días 1..N)
  let descuentoAplicado = 0;
  const today = new Date();
  const diaHoy = today.getDate();
  if (cfg.diasProntoPago && diaHoy >= 1 && diaHoy <= cfg.diasProntoPago) {
    descuentoAplicado = (charge.montoBase * (cfg.porcentajeProntoPago ?? 0)) / 100;
  }

  const final = Math.max(0, Number(charge.total) - descuentoAplicado);

  await update(ref(db, `${chargesNode}/${chargeId}`), {
    estado: 'pagado',
    descuentos:
      descuentoAplicado > 0
        ? [
            ...(charge.descuentos || []),
            {
              id: `pp_${Date.now()}`,
              tipo: 'pronto_pago',
              porcentaje: cfg.porcentajeProntoPago,
              monto: descuentoAplicado,
              motivo: `Pronto pago (${cfg.porcentajeProntoPago}%)`,
              fechaAplicacion: new Date().toLocaleDateString('es-PE'),
            },
          ]
        : charge.descuentos || [],
    total: Number(charge.total) - descuentoAplicado,
    saldo: 0,
    metodoPago: pagoData.metodoPago || null,
    numeroOperacion: pagoData.numeroOperacion || null,
    comprobante: pagoData.comprobantePago || null,
    fechaPago: new Date().toLocaleDateString('es-PE'),
    timestamps: { ...(charge.timestamps || {}), actualizado: new Date().toISOString() },
  });

  const pagosRef = ref(db, 'cobranzas/pagos');
  const nuevoPagoRef = push(pagosRef);
  const pago: Pago = {
    ...pagoData,
    id: nuevoPagoRef.key!,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creadoPor: userUid,
    montoOriginal: charge.montoBase,
    monto: final,
  };
  await set(nuevoPagoRef, pago);

  return nuevoPagoRef.key!;
};

export const obtenerPagos = async (): Promise<Pago[]> => {
  const snapshot = await get(ref(db, 'cobranzas/pagos'));
  if (!snapshot.exists()) return [];
  const pagos = Object.values(snapshot.val()) as Pago[];
  return pagos.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const obtenerPagosPorEmpadronado = async (empadronadoId: string): Promise<Pago[]> => {
  const chargesRoot = ref(db, 'cobranzas/charges');
  const chargesSnap = await get(chargesRoot);
  if (!chargesSnap.exists()) return [];

  const periods = chargesSnap.val();
  const items: Pago[] = [];
  const pagosEmp = (await obtenerPagos()).filter((p) => p.empadronadoId === empadronadoId);

  Object.keys(periods).forEach((yyyymm) => {
    const node = periods[yyyymm]?.[empadronadoId];
    if (!node) return;
    const chargeId = Object.keys(node)[0];
    const c = node[chargeId];
    const año = Number(yyyymm.slice(0, 4));
    const mes = Number(yyyymm.slice(4, 6));

    const pagoReal = c.estado === 'pagado' ? pagosEmp.find((p) => p.año === año && p.mes === mes) : undefined;

    items.push({
      id: chargeId,
      empadronadoId,
      numeroPadron: c.numeroPadron,
      año,
      mes,
      montoOriginal: Number(c.montoBase) || 0,
      monto: Number(c.total) || 0,
      fechaVencimiento: c.vencimiento,
      estado: c.estado,
      descuentos: c.descuentos || [],
      recargos: c.recargos || [],
      metodoPago: pagoReal?.metodoPago || c.metodoPago || null,
      numeroOperacion: pagoReal?.numeroOperacion || c.numeroOperacion || null,
      comprobantePago: pagoReal?.comprobantePago || c.comprobante || null,
      fechaPago: pagoReal?.fechaPago || c.fechaPago || null,
      creadoPor: pagoReal?.creadoPor || undefined,
      createdAt: pagoReal?.createdAt || undefined,
      updatedAt: pagoReal?.updatedAt || undefined,
    } as Pago);
  });

  return items.sort((a, b) => b.año - a.año || b.mes - a.mes);
};

export const actualizarPago = async (pagoId: string, updates: Partial<Pago>, userUid: string): Promise<void> => {
  const pagoRef = ref(db, `cobranzas/pagos/${pagoId}`);
  await update(pagoRef, {
    ...updates,
    updatedAt: Date.now(),
    pagadoPor: userUid,
  });
};

/* ──────────────────────────────────────────────────────────
   INGRESOS LIBRES (donaciones / eventos / alquiler / otros)
   ────────────────────────────────────────────────────────── */
// Nodo: cobranzas/ingresos/{id}

export const crearIngreso = async (
  ingresoData: Omit<Ingreso, 'id' | 'createdAt' | 'updatedAt' | 'registradoPor'>,
  userUid: string
): Promise<string> => {
  const ingresosRef = ref(db, 'cobranzas/ingresos');
  const nuevoRef = push(ingresosRef);

  const ingreso: Ingreso = {
    ...ingresoData,
    id: nuevoRef.key!,
    registradoPor: userUid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(nuevoRef, ingreso);
  return nuevoRef.key!;
};

export const obtenerIngresos = async (): Promise<Ingreso[]> => {
  const snap = await get(ref(db, 'cobranzas/ingresos'));
  if (!snap.exists()) return [];
  const list = Object.values(snap.val()) as Ingreso[];
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const obtenerIngresosMes = async (año: number, mes: number): Promise<Ingreso[]> => {
  const all = await obtenerIngresos();
  return all.filter((i) => {
    // i.fecha: "dd/mm/aaaa"
    const [, mm, aa] = i.fecha.split('/');
    return Number(mm) === mes && Number(aa) === año;
  });
};

export const actualizarIngreso = async (ingresoId: string, updates: Partial<Ingreso>): Promise<void> => {
  await update(ref(db, `cobranzas/ingresos/${ingresoId}`), {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const eliminarIngreso = async (ingresoId: string): Promise<void> => {
  await remove(ref(db, `cobranzas/ingresos/${ingresoId}`));
};

/* ──────────────────────────────────────────────────────────
   EGRESOS
   ────────────────────────────────────────────────────────── */
export const crearEgreso = async (
  egresoData: Omit<Egreso, 'id' | 'createdAt' | 'updatedAt'>,
  userUid: string
): Promise<string> => {
  const egresosRef = ref(db, 'cobranzas/egresos');
  const nuevoEgresoRef = push(egresosRef);

  const egreso: Egreso = {
    ...egresoData,
    id: nuevoEgresoRef.key!,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    realizadoPor: userUid,
  };

  await set(nuevoEgresoRef, egreso);
  return nuevoEgresoRef.key!;
};

export const obtenerEgresos = async (): Promise<Egreso[]> => {
  const snapshot = await get(ref(db, 'cobranzas/egresos'));
  if (!snapshot.exists()) return [];
  const egresos = Object.values(snapshot.val()) as Egreso[];
  return egresos.sort((a, b) => b.updatedAt - a.updatedAt);
};

/* ──────────────────────────────────────────────────────────
   Declaraciones juradas / Sanciones
   ────────────────────────────────────────────────────────── */
export const crearDeclaracionJurada = async (
  declaracionData: Omit<DeclaracionJurada, 'id' | 'fechaSolicitud'>
): Promise<string> => {
  const declaracionesRef = ref(db, 'cobranzas/declaracionesJuradas');
  const nuevaDeclaracionRef = push(declaracionesRef);
  const declaracion: DeclaracionJurada = {
    ...declaracionData,
    id: nuevaDeclaracionRef.key!,
    fechaSolicitud: new Date().toLocaleDateString('es-PE'),
  };
  await set(nuevaDeclaracionRef, declaracion);
  return nuevaDeclaracionRef.key!;
};

export const aprobarDeclaracionJurada = async (
  declaracionId: string,
  aprobadoPor: 'presidente' | 'fiscal',
  _userUid: string
): Promise<void> => {
  const declaracionRef = ref(db, `cobranzas/declaracionesJuradas/${declaracionId}`);
  const snapshot = await get(declaracionRef);
  if (!snapshot.exists()) return;

  const declaracion = snapshot.val() as DeclaracionJurada;
  const updates: Partial<DeclaracionJurada> = {};

  if (aprobadoPor === 'presidente') updates.aprobadoPorPresidente = true;
  if (aprobadoPor === 'fiscal') updates.aprobadoPorFiscal = true;

  if (
    (declaracion.aprobadoPorPresidente || aprobadoPor === 'presidente') &&
    (declaracion.aprobadoPorFiscal || aprobadoPor === 'fiscal')
  ) {
    updates.estado = 'aprobado';
    updates.fechaAprobacion = new Date().toLocaleDateString('es-PE');
  }

  await update(declaracionRef, updates);
};

export const aplicarSancion = async (sancionData: Omit<PlantillaSancion, 'id'>): Promise<string> => {
  const sancionesRef = ref(db, 'cobranzas/sanciones');
  const nuevaSancionRef = push(sancionesRef);
  const sancion: PlantillaSancion = { ...sancionData, id: nuevaSancionRef.key! };
  await set(nuevaSancionRef, sancion);
  return nuevaSancionRef.key!;
};

/* ──────────────────────────────────────────────────────────
   Estadísticas (lee CHARGES + INGRESOS + EGRESOS del mes)
   ────────────────────────────────────────────────────────── */
export const generarEstadisticas = async (): Promise<EstadisticasCobranzas> => {
  const [egresos, empadronados] = await Promise.all([
    obtenerEgresos(),
    obtenerEmpadronados(),
  ]);

  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const keyMesActual = periodCompact(periodFromYM(añoActual, mesActual));

  // Totales globales (todos los meses)
  let totalPendienteGlobal = 0;
  const morososGlobal = new Set<string>();

  // Totales del mes actual (para KPIs mensuales)
  let recaudadoMesActual = 0;
  let cargosMesActual = 0;
  let pagadosMesActual = 0;

  const chargesRootSnap = await get(ref(db, "cobranzas/charges"));
  if (chargesRootSnap.exists()) {
    const allPeriods = chargesRootSnap.val() as Record<
      string,
      Record<string, Record<string, any>>
    >; // {YYYYMM: {empId: {chargeId: charge}}}

    for (const yyyymm of Object.keys(allPeriods)) {
      const perNode = allPeriods[yyyymm];
      const esMesActual = yyyymm === keyMesActual;

      for (const empId of Object.keys(perNode)) {
        const node = perNode[empId];
        const chargeId = Object.keys(node)[0];
        const c = node[chargeId];

        const total = Number(c.total || 0);
        const saldo = Number(c.saldo || 0);

        // Global: deuda total acumulada
        totalPendienteGlobal += saldo;
        if (c.estado === "moroso") morososGlobal.add(empId);

        // Mes actual: recaudado y tasa de cobranza
        if (esMesActual) {
          cargosMesActual += 1;
          recaudadoMesActual += (total - saldo); // lo efectivamente cobrado del mes
          if (c.estado === "pagado") pagadosMesActual += 1;
        }
      }
    }
  }

  // Egresos del mes actual
  const egresosMesActual = egresos.filter((e) => {
    const [dd, mm, aa] = e.fecha.split("/");
    return Number(mm) === mesActual && Number(aa) === añoActual;
  });
  const totalEgresosMes = egresosMesActual.reduce(
    (sum, e) => sum + Number(e.monto || 0),
    0
  );

  // Tasa de cobranza: % de empadronados con su cargo del mes actual pagado
  const tasaCobranza =
    empadronados.length > 0
      ? (pagadosMesActual / empadronados.length) * 100
      : 0;

  return {
    totalEmpadronados: empadronados.length,
    totalRecaudado: recaudadoMesActual,   // del mes actual
    totalPendiente: totalPendienteGlobal, // acumulado todos los meses
    totalMorosos: morososGlobal.size,     // socios con algún periodo moroso
    tasaCobranza,
    ingresosMes: recaudadoMesActual,
    egresosMes: totalEgresosMes,
    saldoActual: recaudadoMesActual - totalEgresosMes,
  };
};


/* ──────────────────────────────────────────────────────────
   Cierre mensual (morosidad por vencimiento)
   ────────────────────────────────────────────────────────── */
export const ejecutarCierreMensual = async (_userUid: string): Promise<void> => {
  const cfg = await obtenerConfiguracion();
  const chargesRootSnap = await get(ref(db, 'cobranzas/charges'));
  if (!chargesRootSnap.exists()) return;

  const today = new Date();
  const allPeriods = chargesRootSnap.val();

  for (const yyyymm of Object.keys(allPeriods)) {
    const perNode = allPeriods[yyyymm];
    for (const empId of Object.keys(perNode)) {
      const node = perNode[empId];
      const chargeId = Object.keys(node)[0];
      const c = node[chargeId];

      if (c.estado === 'pagado') continue;

      const [dd, mm, aa] = String(c.vencimiento || '').split('/');
      const vencDate = new Date(Number(aa), Number(mm) - 1, Number(dd));

      if (today.getTime() > vencDate.getTime() && Number(c.saldo || 0) > 0) {
        const recargoMonto = (Number(c.montoBase || 0) * (cfg.porcentajeMorosidad || 0)) / 100;

        await update(ref(db, `cobranzas/charges/${yyyymm}/${empId}/${chargeId}`), {
          estado: 'moroso',
          recargos: [
            ...(c.recargos || []),
            {
              id: `mor_${Date.now()}`,
              tipo: 'morosidad',
              porcentaje: cfg.porcentajeMorosidad,
              monto: recargoMonto,
              motivo: 'Recargo por morosidad',
              fechaAplicacion: new Date().toLocaleDateString('es-PE'),
            },
          ],
          total: Number(c.total || 0) + recargoMonto,
          saldo: Number(c.saldo || 0) + recargoMonto,
          timestamps: { ...(c.timestamps || {}), actualizado: new Date().toISOString() },
        });
      }
    }
  }
};
