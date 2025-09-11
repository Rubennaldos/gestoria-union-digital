// src/lib/cobranzas/debt.ts
import type { BillingConfig } from "@/contexts/BillingConfigContext";

export type DeudaCalculada = {
  quincenas: number;   // cuántas quincenas cerradas debe
  monto: number;       // quincenas * cfg.montoBase
  desde: string;       // ISO
  hasta: string;       // ISO
};

/**
 * Reglas:
 * - Si ingreso < cfg.fechaCorteISO => se cobra desde cfg.fechaCorteISO.
 * - Si ingreso >= cfg.fechaCorteISO => se cobra desde ingreso.
 * - Solo se cobran quincenas CERRADAS (1ra cierra el día cierreDia, 2da cierra fin de mes).
 */
export function calcularDeuda(
  args: { fechaIngresoISO: string },
  cfg: BillingConfig
): DeudaCalculada {
  const hoy = startOfDay(new Date());
  const ingreso = parseISO(args.fechaIngresoISO);
  const corte   = parseISO(cfg.fechaCorteISO);

  const desde = ingreso.getTime() < corte.getTime() ? corte : ingreso;

  const quincenas = contarQuincenasCerradas(desde, hoy, cfg.cierreDia);
  return {
    quincenas,
    monto: quincenas * Number(cfg.montoBase || 0),
    desde: toISO(desde),
    hasta: toISO(hoy),
  };
}

/* -------------------- helpers -------------------- */

function contarQuincenasCerradas(desde: Date, hasta: Date, cierreDia: number): number {
  let cursor = startOfDay(desde);
  let count = 0;

  while (true) {
    const limite = proximoLimite(cursor, cierreDia);
    if (hasta.getTime() > limite.getTime()) {
      count++;
      cursor = addDays(limite, 1); // siguiente periodo arranca día siguiente del límite
    } else {
      break;
    }
  }
  return count;
}

function proximoLimite(d: Date, cierreDia: number): Date {
  // Si el día del mes de d es <= cierreDia, el límite es el cierre de primera quincena
  if (d.getDate() <= cierreDia) {
    return cierrePrimeraQuincena(d, cierreDia);
  }
  // Si ya pasó el cierre de primera quincena, el límite es fin de mes
  return cierreSegundaQuincena(d);
}

function cierrePrimeraQuincena(d: Date, cierreDia: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), cierreDia, 0, 0, 0, 0);
}

function cierreSegundaQuincena(d: Date): Date {
  const ld = lastDayOfMonth(d);
  return new Date(ld.getFullYear(), ld.getMonth(), ld.getDate(), 0, 0, 0, 0);
}

function lastDayOfMonth(d: Date): Date {
  // El día 0 del mes siguiente es el último día del mes actual
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function startOfDay(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function parseISO(s: string): Date {
  if (!s) return startOfDay(new Date());
  const d = new Date(s);
  if (isNaN(d.getTime())) return startOfDay(new Date());
  return startOfDay(d);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
