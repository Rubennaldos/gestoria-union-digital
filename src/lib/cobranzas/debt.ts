// src/lib/cobranzas/debt.ts
import type { BillingConfig } from "@/contexts/BillingConfigContext";

export type DeudaCalculada = {
  meses: number;       // cuántos meses cerrados debe
  monto: number;       // meses * cfg.montoBase
  desde: string;       // ISO
  hasta: string;       // ISO
};

/**
 * Reglas para cobro MENSUAL:
 * - Si ingreso < cfg.fechaCorteISO => se cobra desde cfg.fechaCorteISO.
 * - Si ingreso >= cfg.fechaCorteISO => se cobra desde ingreso.
 * - Se cobra 1 vez al mes, el día cfg.cierreDia de cada mes.
 * - Solo se cobran meses CERRADOS (donde ya pasó el día de cierre).
 */
export function calcularDeuda(
  args: { fechaIngresoISO: string },
  cfg: BillingConfig
): DeudaCalculada {
  const hoy = startOfDay(new Date());
  const ingreso = parseISO(args.fechaIngresoISO);
  const corte   = parseISO(cfg.fechaCorteISO);

  const desde = ingreso.getTime() < corte.getTime() ? corte : ingreso;

  const meses = contarMesesCerrados(desde, hoy, cfg.cierreDia);
  return {
    meses,
    monto: meses * Number(cfg.montoBase || 0),
    desde: toISO(desde),
    hasta: toISO(hoy),
  };
}

/* -------------------- helpers -------------------- */

/**
 * Cuenta cuántos meses han cerrado desde la fecha 'desde' hasta 'hasta'.
 * Un mes cierra el día 'cierreDia' de ese mes.
 * 
 * Ejemplo: Si cierreDia = 14
 * - Enero cierra el 14-ene
 * - Febrero cierra el 14-feb
 * - etc.
 */
function contarMesesCerrados(desde: Date, hasta: Date, cierreDia: number): number {
  let count = 0;
  let cursor = new Date(desde.getFullYear(), desde.getMonth(), 1); // Primer día del mes de inicio

  while (cursor.getTime() <= hasta.getTime()) {
    // Fecha de cierre de este mes
    const fechaCierre = new Date(cursor.getFullYear(), cursor.getMonth(), cierreDia, 0, 0, 0, 0);
    
    // Si la fecha de inicio es después del cierre de este mes, no se cobra este mes
    // Si hoy es antes del cierre de este mes, no se cobra este mes
    if (desde.getTime() <= fechaCierre.getTime() && hasta.getTime() >= fechaCierre.getTime()) {
      count++;
    }
    
    // Avanzar al siguiente mes
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  
  return count;
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
