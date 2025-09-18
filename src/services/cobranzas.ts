import { ref, push, set, get, update, remove } from "firebase/database";
import { db } from "@/config/firebase";
import {
  Pago,
  Egreso,
  Ingreso,
  ConfiguracionCobranzas,
  EstadisticasCobranzas,
  DeclaracionJurada,
  PlantillaSancion,
} from "@/types/cobranzas";
import { Empadronado } from "@/types/empadronados";

/* RUTAS */
const CONFIG_PATH = "cobranzas/configuracion";
const CHARGES_PATH = "cobranzas/charges";
const PAGOS_PATH = "cobranzas/pagos";

/* ──────────────────────────────────────────────────────────
   Helpers de periodos/fechas - SISTEMA DE QUINCENAS
   ────────────────────────────────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");

// Fecha de corte para el sistema (15 de enero 2025)
const FECHA_CORTE_SISTEMA = new Date(2025, 0, 15); // 15/01/2025

// Constantes para quincenas
const PRIMERA_QUINCENA_CIERRE = 14;

// Helper para obtener el último día del mes
const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

// Helper para determinar si una quincena está cerrada
const isQuincenaCerrada = (
  year: number,
  month: number,
  quincena: 1 | 2,
  fechaReferencia: Date = new Date()
): boolean => {
  const hoy = fechaReferencia;
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();

  // futuro
  if (year > añoActual || (year === añoActual && month > mesActual)) return false;
  // pasado
  if (year < añoActual || (year === añoActual && month < mesActual)) return true;

  // mes actual
  if (quincena === 1) {
    return diaActual > PRIMERA_QUINCENA_CIERRE; // cerró el 14
  } else {
    const ultimo = getLastDayOfMonth(year, month);
    return diaActual > ultimo; // último día del mes
  }
};

// Calcular quincenas desde fecha de ingreso
const calcularQuincenasDesdeIngreso = (
  fechaIngreso: string,
  fechaReferencia: Date = new Date()
): { año: number; mes: number; quincena: 1 | 2 }[] => {
  const [dia, mes, año] = fechaIngreso.split("/").map(Number);
  const fechaIngresoDate = new Date(año, mes - 1, dia);

  let fechaInicio: Date;

  // Reglas de inicio
  if (fechaIngresoDate < FECHA_CORTE_SISTEMA) {
    fechaInicio = new Date(2025, 0, 15); // 15/01/2025
  } else {
    if (dia >= 1 && dia <= 14) {
      fechaInicio = new Date(año, mes - 1, 1); // ese mes
    } else {
      // mes siguiente
      let siguienteMes = mes + 1;
      let siguienteAño = año;
      if (siguienteMes > 12) {
        siguienteMes = 1;
        siguienteAño++;
      }
      fechaInicio = new Date(siguienteAño, siguienteMes - 1, 1);
    }
  }

  const quincenas: { año: number; mes: number; quincena: 1 | 2 }[] = [];
  const cursor = new Date(fechaInicio);

  while (cursor <= fechaReferencia) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;

    if (isQuincenaCerrada(y, m, 1, fechaReferencia)) quincenas.push({ año: y, mes: m, quincena: 1 });
    if (isQuincenaCerrada(y, m, 2, fechaReferencia)) quincenas.push({ año: y, mes: m, quincena: 2 });

    cursor.setMonth(cursor.getMonth() + 1);
  }
  return quincenas;
};

// Formatos de periodo
const periodFromYM = (y: number, m: number) => `${y}-${pad2(m)}`;
const periodCompact = (period: string) => period.replace("-", "");
const nowPeriod = () => {
  const d = new Date();
  return periodFromYM(d.getFullYear(), d.getMonth() + 1);
};
const addMonths = (period: string, n: number) => {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return periodFromYM(d.getFullYear(), d.getMonth() + 1);
};
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

// DD/MM/YYYY
const toEsDate = (y: number, m: number, day: number) => {
  const d = new Date(y, m - 1, day);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  return `${dd}/${mm}/${d.getFullYear()}`;
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

export const actualizarEgreso = async (egresoId: string, updates: Partial<Egreso>): Promise<void> => {
  await update(ref(db, `cobranzas/egresos/${egresoId}`), {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const eliminarEgreso = async (egresoId: string): Promise<void> => {
  await remove(ref(db, `cobranzas/egresos/${egresoId}`));
};


/* ──────────────────────────────────────────────────────────
   Configuración (con defaults)
   ────────────────────────────────────────────────────────── */
export const obtenerConfiguracion = async (): Promise<ConfiguracionCobranzas> => {
  const snapshot = await get(ref(db, CONFIG_PATH));

  if (!snapshot.exists()) {
    const configDefault: ConfiguracionCobranzas = {
      montoMensual: 50,
      montoQuincenal: 25,
      sistemaQuincenas: true,
      diaVencimiento: 15,
      diaCierre: 14,
      diasProntoPago: 3,
      porcentajeProntoPago: 10,
      porcentajeMorosidad: 5,
      porcentajeSancion: 10,
      serieComprobantes: "COB",
      numeroComprobanteActual: 1,
      sede: "Principal",
    };
    await set(ref(db, CONFIG_PATH), configDefault);
    return configDefault;
  }

  return snapshot.val() as ConfiguracionCobranzas;
};

export const actualizarConfiguracion = async (config: ConfiguracionCobranzas): Promise<void> => {
  await set(ref(db, CONFIG_PATH), config);
};

/* ──────────────────────────────────────────────────────────
   Empadronados (utils)
   ────────────────────────────────────────────────────────── */
const obtenerEmpadronados = async (): Promise<Empadronado[]> => {
  const { getEmpadronados } = await import("@/services/empadronados");
  return await getEmpadronados();
};

const getEmpadronadoById = async (id: string): Promise<Empadronado | null> => {
  const snap = await get(ref(db, `empadronados/${id}`));
  return snap.exists() ? (snap.val() as Empadronado) : null;
};

/* ──────────────────────────────────────────────────────────
   CHARGES (mensual legacy) helpers
   ────────────────────────────────────────────────────────── */
const ensureChargeForPeriod = async (emp: Empadronado, period: string) => {
  const cfg = await obtenerConfiguracion();
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const vencStr = toEsDate(y, m, cfg.diaVencimiento);

  const node = `${CHARGES_PATH}/${periodCompact(period)}/${emp.id}`;
  const exist = await get(ref(db, node));
  if (exist.exists()) {
    // ya hay algo para ese mes/emp (puede ser mensual o quincenas). No crear mensual duplicado.
    const vals = exist.val();
    const alreadyMonthly = Object.values<any>(vals).some((c) => !("quincena" in c));
    if (alreadyMonthly) return false;
  }

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
    estado: "pendiente",
    timestamps: {
      creado: new Date().toISOString(),
      actualizado: new Date().toISOString(),
    },
  });

  return true;
};

/* ──────────────────────────────────────────────────────────
   QUINCENAS → crear CHARGES con quincena: 1 | 2
   ────────────────────────────────────────────────────────── */
async function ensureQuincenaCharge(
  emp: Empadronado,
  y: number,
  m: number,
  quincena: 1 | 2
): Promise<boolean> {
  const cfg = await obtenerConfiguracion();
  const period = periodFromYM(y, m);
  const yyyymm = periodCompact(period);

  const node = `${CHARGES_PATH}/${yyyymm}/${emp.id}`;
  const snap = await get(ref(db, node));
  if (snap.exists()) {
    const vals = snap.val();
    const existsForQ = Object.values<any>(vals).some((c) => Number(c.quincena) === Number(quincena));
    if (existsForQ) return false;
  }

  // vencimiento: día configurado del mes siguiente
  let mesVenc = m + 1;
  let añoVenc = y;
  if (mesVenc > 12) {
    mesVenc = 1;
    añoVenc++;
  }
  const fechaVencimiento = toEsDate(añoVenc, mesVenc, cfg.diaVencimiento);
  const monto = cfg.montoQuincenal || cfg.montoMensual / 2;

  const chargeId = push(ref(db, node)).key!;
  await set(ref(db, `${node}/${chargeId}`), {
    empadronadoId: emp.id,
    numeroPadron: emp.numeroPadron || "",
    periodo: period,
    quincena,
    vencimiento: fechaVencimiento,
    montoBase: monto,
    descuentos: [],
    recargos: [],
    total: monto,
    saldo: monto,
    estado: "pendiente",
    timestamps: { creado: new Date().toISOString(), actualizado: new Date().toISOString() },
  });

  return true;
}

// Generar charges por QUINCENAS para 1 socio
export const generarPagosQuincenasEmpadronado = async (empadronado: Empadronado): Promise<number> => {
  if (!empadronado.fechaIngreso) return 0;

  const cfg = await obtenerConfiguracion();
  if (!cfg.sistemaQuincenas) return 0;

  // fechaIngreso (timestamp) → "dd/mm/aaaa"
  const fechaIngresoStr = new Date(empadronado.fechaIngreso).toLocaleDateString("es-ES");
  const quincenas = calcularQuincenasDesdeIngreso(fechaIngresoStr, new Date());

  let creados = 0;
  for (const { año, mes, quincena } of quincenas) {
    const ok = await ensureQuincenaCharge(empadronado, año, mes, quincena);
    if (ok) creados++;
  }
  return creados;
};

// Limpieza sencilla: elimina charges de quincena con monto incorrecto
export const limpiarPagosQuincenasIncorrectos = async (): Promise<number> => {
  const cfg = await obtenerConfiguracion();
  const snap = await get(ref(db, CHARGES_PATH));
  if (!snap.exists()) return 0;

  const root = snap.val() as Record<string, Record<string, Record<string, any>>>;
  const montoQ = cfg.montoQuincenal || cfg.montoMensual / 2;

  let removed = 0;
  for (const yyyymm of Object.keys(root)) {
    for (const empId of Object.keys(root[yyyymm])) {
      const node = root[yyyymm][empId];
      for (const chargeId of Object.keys(node)) {
        const c = node[chargeId];
        if (c?.quincena && Number(c.montoBase) !== Number(montoQ)) {
          await remove(ref(db, `${CHARGES_PATH}/${yyyymm}/${empId}/${chargeId}`));
          removed++;
        }
      }
    }
  }
  return removed;
};

// Generar charges por QUINCENAS para todos
export const generarPagosQuincenasTodos = async (): Promise<{
  procesados: number;
  pagosCreados: number;
  pagosLimpiados: number;
}> => {
  const pagosLimpiados = await limpiarPagosQuincenasIncorrectos();
  const lista = await obtenerEmpadronados();
  const activos = lista.filter((e) => e?.habilitado !== false && e?.fechaIngreso);

  let total = 0;
  for (const emp of activos) {
    total += await generarPagosQuincenasEmpadronado(emp);
  }
  return { procesados: activos.length, pagosCreados: total, pagosLimpiados };
};

/* ──────────────────────────────────────────────────────────
   Generar charges MENSUALES (legacy)
   ────────────────────────────────────────────────────────── */
export const ensureChargesForNewMember = async (empId: string, startPeriod = "2025-01") => {
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
  const start = "2025-01";
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
   PAGOS (comprobantes) – se guardan en cobranzas/pagos
   ────────────────────────────────────────────────────────── */
export const crearPago = async (
  pagoData: Omit<Pago, "id" | "createdAt" | "updatedAt">,
  userUid: string
): Promise<string> => {
  const cfg = await obtenerConfiguracion();

  const period = periodFromYM(pagoData.año, pagoData.mes);
  const emp = await getEmpadronadoById(pagoData.empadronadoId);
  if (!emp) throw new Error("Empadronado no encontrado");

  // asegurar que exista un charge del periodo si es mensual
  if (pagoData.quincena == null) {
    await ensureChargeForPeriod(emp, period);
  }

  // buscar charge objetivo (si trae quincena, usarlo; si no, el mensual no pagado)
  const yyyymm = periodCompact(period);
  const chargesNode = `${CHARGES_PATH}/${yyyymm}/${emp.id}`;
  const chargesSnap = await get(ref(db, chargesNode));
  if (!chargesSnap.exists()) throw new Error("Charge no encontrado");

  const charges = chargesSnap.val();
  let chargeId: string | null = null;
  let charge: any = null;

  for (const id of Object.keys(charges)) {
    const c = charges[id];
    const isTargetQ =
      pagoData.quincena != null ? Number(c.quincena) === Number(pagoData.quincena) : !("quincena" in c);
    if (isTargetQ && c.estado !== "pagado") {
      chargeId = id;
      charge = c;
      break;
    }
  }
  // fallback: cualquiera (si ya estaba pagado)
  if (!chargeId) {
    chargeId = Object.keys(charges)[0];
    charge = charges[chargeId];
  }

  // Pronto pago (días 1..N)
  let descuentoAplicado = 0;
  const today = new Date();
  const diaHoy = today.getDate();
  if (cfg.diasProntoPago && diaHoy >= 1 && diaHoy <= cfg.diasProntoPago) {
    descuentoAplicado = (Number(charge.montoBase) * (cfg.porcentajeProntoPago ?? 0)) / 100;
  }

  const final = Math.max(0, Number(charge.total) - descuentoAplicado);

  await update(ref(db, `${chargesNode}/${chargeId}`), {
    estado: "pagado",
    descuentos:
      descuentoAplicado > 0
        ? [
            ...(charge.descuentos || []),
            {
              id: `pp_${Date.now()}`,
              tipo: "pronto_pago",
              porcentaje: cfg.porcentajeProntoPago,
              monto: descuentoAplicado,
              motivo: `Pronto pago (${cfg.porcentajeProntoPago}%)`,
              fechaAplicacion: new Date().toLocaleDateString("es-PE"),
            },
          ]
        : charge.descuentos || [],
    total: Number(charge.total) - descuentoAplicado,
    saldo: 0,
    metodoPago: pagoData.metodoPago || null,
    numeroOperacion: pagoData.numeroOperacion || null,
    comprobante: pagoData.comprobantePago || null,
    fechaPago: new Date().toLocaleDateString("es-PE"),
    timestamps: { ...(charge.timestamps || {}), actualizado: new Date().toISOString() },
  });

  // Registrar comprobante en cobranzas/pagos
  const pagosRef = ref(db, PAGOS_PATH);
  const nuevoPagoRef = push(pagosRef);
  const pago: Pago = {
    ...pagoData,
    id: nuevoPagoRef.key!,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creadoPor: userUid,
    montoOriginal: Number(charge.montoBase),
    monto: final,
  };
  await set(nuevoPagoRef, pago);

  invalidarCachePagos();
  return nuevoPagoRef.key!;
};

export const obtenerPagos = async (): Promise<Pago[]> => {
  const snapshot = await get(ref(db, PAGOS_PATH));
  if (!snapshot.exists()) return [];
  const pagos = Object.values(snapshot.val()) as Pago[];
  return pagos.sort((a, b) => b.updatedAt - a.updatedAt);
};

// Cache de pagos
let pagosCacheGlobal: Pago[] | null = null;
let ultimaActualizacionPagos = 0;

/** Devuelve la "vista" de pagos/charges para un empadronado. */
export const obtenerPagosPorEmpadronado = async (empadronadoId: string): Promise<Pago[]> => {
  // Cargar cache de comprobantes
  const ahora = Date.now();
  if (!pagosCacheGlobal || ahora - ultimaActualizacionPagos > 30000) {
    pagosCacheGlobal = await obtenerPagos();
    ultimaActualizacionPagos = ahora;
  }
  const pagosEmp = pagosCacheGlobal.filter((p) => p.empadronadoId === empadronadoId);

  // Recorrer TODOS los charges (mensuales y quincenas) del empadronado
  const chargesRoot = ref(db, CHARGES_PATH);
  const chargesSnap = await get(chargesRoot);
  if (!chargesSnap.exists()) return [];

  const periods = chargesSnap.val() as Record<string, Record<string, Record<string, any>>>;
  const items: Pago[] = [];

  Object.keys(periods).forEach((yyyymm) => {
    const nodeEmp = periods[yyyymm]?.[empadronadoId];
    if (!nodeEmp) return;

    const año = Number(yyyymm.slice(0, 4));
    const mes = Number(yyyymm.slice(4, 6));

    Object.keys(nodeEmp).forEach((chargeId) => {
      const c = nodeEmp[chargeId];

      const pagoReal =
        c.estado === "pagado"
          ? pagosEmp.find(
              (p) =>
                p.año === año &&
                p.mes === mes &&
                (c.quincena == null || p.quincena == null ? true : Number(p.quincena) === Number(c.quincena))
            )
          : undefined;

      items.push({
        id: chargeId,
        empadronadoId,
        numeroPadron: c.numeroPadron,
        año,
        mes,
        quincena: c.quincena as any,
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
  });

  // orden: más reciente primero
  return items.sort((a, b) => b.año - a.año || b.mes - a.mes || (Number(b.quincena || 0) - Number(a.quincena || 0)));
};

// Invalidar cache de pagos
export const invalidarCachePagos = () => {
  pagosCacheGlobal = null;
  ultimaActualizacionPagos = 0;
};

export const actualizarPago = async (pagoId: string, updates: Partial<Pago>, userUid: string): Promise<void> => {
  const pagoRef = ref(db, `${PAGOS_PATH}/${pagoId}`);
  await update(pagoRef, {
    ...updates,
    updatedAt: Date.now(),
    pagadoPor: userUid,
  });
  invalidarCachePagos();
};

/* ──────────────────────────────────────────────────────────
   INGRESOS LIBRES
   ────────────────────────────────────────────────────────── */
export const crearIngreso = async (
  ingresoData: Omit<Ingreso, "id" | "createdAt" | "updatedAt" | "registradoPor">,
  userUid: string
): Promise<string> => {
  const ingresosRef = ref(db, "cobranzas/ingresos");
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
  const snap = await get(ref(db, "cobranzas/ingresos"));
  if (!snap.exists()) return [];
  const list = Object.values(snap.val()) as Ingreso[];
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const obtenerIngresosMes = async (año: number, mes: number): Promise<Ingreso[]> => {
  const all = await obtenerIngresos();
  return all.filter((i) => {
    const [, mm, aa] = i.fecha.split("/");
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
   Declaraciones juradas / Sanciones
   ────────────────────────────────────────────────────────── */
export const crearDeclaracionJurada = async (
  declaracionData: Omit<DeclaracionJurada, "id" | "fechaSolicitud">
): Promise<string> => {
  const declaracionesRef = ref(db, "cobranzas/declaracionesJuradas");
  const nuevaDeclaracionRef = push(declaracionesRef);
  const declaracion: DeclaracionJurada = {
    ...declaracionData,
    id: nuevaDeclaracionRef.key!,
    fechaSolicitud: new Date().toLocaleDateString("es-PE"),
  };
  await set(nuevaDeclaracionRef, declaracion);
  return nuevaDeclaracionRef.key!;
};

export const aprobarDeclaracionJurada = async (
  declaracionId: string,
  aprobadoPor: "presidente" | "fiscal",
  _userUid: string
): Promise<void> => {
  const declaracionRef = ref(db, `cobranzas/declaracionesJuradas/${declaracionId}`);
  const snapshot = await get(declaracionRef);
  if (!snapshot.exists()) return;

  const declaracion = snapshot.val() as DeclaracionJurada;
  const updates: Partial<DeclaracionJurada> = {};

  if (aprobadoPor === "presidente") updates.aprobadoPorPresidente = true;
  if (aprobadoPor === "fiscal") updates.aprobadoPorFiscal = true;

  if (
    (declaracion.aprobadoPorPresidente || aprobadoPor === "presidente") &&
    (declaracion.aprobadoPorFiscal || aprobadoPor === "fiscal")
  ) {
    updates.estado = "aprobado";
    updates.fechaAprobacion = new Date().toLocaleDateString("es-PE");
  }

  await update(declaracionRef, updates);
};

export const aplicarSancion = async (sancionData: Omit<PlantillaSancion, "id">): Promise<string> => {
  const sancionesRef = ref(db, "cobranzas/sanciones");
  const nuevaSancionRef = push(sancionesRef);
  const sancion: PlantillaSancion = { ...sancionData, id: nuevaSancionRef.key! };
  await set(nuevaSancionRef, sancion);
  return nuevaSancionRef.key!;
};

/* ──────────────────────────────────────────────────────────
   Estadísticas (usa CHARGES + INGRESOS + EGRESOS)
   ────────────────────────────────────────────────────────── */
export const generarEstadisticas = async (): Promise<EstadisticasCobranzas> => {
  const [egresos, empadronados] = await Promise.all([obtenerEgresos(), obtenerEmpadronados()]);

  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const keyMesActual = periodCompact(periodFromYM(añoActual, mesActual));

  let totalPendienteGlobal = 0;
  const morososGlobal = new Set<string>();

  // KPIs del mes actual
  let recaudadoMesActual = 0;
  let cargosMesActual = 0;
  let pagadosMesActual = 0;

  const chargesRootSnap = await get(ref(db, CHARGES_PATH));
  if (chargesRootSnap.exists()) {
    const allPeriods = chargesRootSnap.val() as Record<string, Record<string, Record<string, any>>>;

    for (const yyyymm of Object.keys(allPeriods)) {
      const perNode = allPeriods[yyyymm];
      const esMesActual = yyyymm === keyMesActual;

      for (const empId of Object.keys(perNode)) {
        const node = perNode[empId];

        for (const chargeId of Object.keys(node)) {
          const c = node[chargeId];
          const total = Number(c.total || 0);
          const saldo = Number(c.saldo || 0);

          totalPendienteGlobal += saldo;
          if (c.estado === "moroso") morososGlobal.add(empId);

          if (esMesActual) {
            cargosMesActual += 1;
            recaudadoMesActual += total - saldo;
            if (c.estado === "pagado") pagadosMesActual += 1;
          }
        }
      }
    }
  }

  // Egresos del mes actual
  const egresosMesActual = egresos.filter((e) => {
    const [dd, mm, aa] = e.fecha.split("/");
    return Number(mm) === mesActual && Number(aa) === añoActual;
  });
  const totalEgresosMes = egresosMesActual.reduce((sum, e) => sum + Number(e.monto || 0), 0);

  // Tasa de cobranza basada en #cargos del mes
  const tasaCobranza = cargosMesActual > 0 ? (pagadosMesActual / cargosMesActual) * 100 : 0;

  return {
    totalEmpadronados: empadronados.length,
    totalRecaudado: recaudadoMesActual,
    totalPendiente: totalPendienteGlobal,
    totalMorosos: morososGlobal.size,
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
  const chargesRootSnap = await get(ref(db, CHARGES_PATH));
  if (!chargesRootSnap.exists()) return;

  const today = new Date();
  const allPeriods = chargesRootSnap.val() as Record<string, Record<string, Record<string, any>>>;

  for (const yyyymm of Object.keys(allPeriods)) {
    for (const empId of Object.keys(allPeriods[yyyymm])) {
      const node = allPeriods[yyyymm][empId];
      for (const chargeId of Object.keys(node)) {
        const c = node[chargeId];
        if (c.estado === "pagado") continue;

        const [dd, mm, aa] = String(c.vencimiento || "").split("/");
        const vencDate = new Date(Number(aa), Number(mm) - 1, Number(dd));

        if (today.getTime() > vencDate.getTime() && Number(c.saldo || 0) > 0) {
          const recargoMonto = (Number(c.montoBase || 0) * (cfg.porcentajeMorosidad || 0)) / 100;

          await update(ref(db, `${CHARGES_PATH}/${yyyymm}/${empId}/${chargeId}`), {
            estado: "moroso",
            recargos: [
              ...(c.recargos || []),
              {
                id: `mor_${Date.now()}`,
                tipo: "morosidad",
                porcentaje: cfg.porcentajeMorosidad,
                monto: recargoMonto,
                motivo: "Recargo por morosidad",
                fechaAplicacion: new Date().toLocaleDateString("es-PE"),
              },
            ],
            total: Number(c.total || 0) + recargoMonto,
            saldo: Number(c.saldo || 0) + recargoMonto,
            timestamps: { ...(c.timestamps || {}), actualizado: new Date().toISOString() },
          });
        }
      }
    }
  }
};
