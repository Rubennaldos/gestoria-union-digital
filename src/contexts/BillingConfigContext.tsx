import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { db } from "@/config/firebase";
import { onValue, ref } from "firebase/database";

export type BillingConfig = {
  // Normalizado para el motor de deuda:
  montoBase: number;          // S/ por quincena (de "montoMensual" en DB)
  cierreDia: number;          // día de cierre 1ª quincena (de "diaCierre")
  vencimientoDia: number;     // día de vencimiento visual (de "diaVencimiento")
  prontoPagoDias: number;     // días (de "diasProntoPago")
  recargoMoraPct: number;     // % (de "porcentajeMorosidad")
  recargoSancionPct: number;  // % (de "porcentajeSancion")
  fechaCorteISO: string;      // "YYYY-MM-DD" (si no existe en DB, 2025-01-15)

  // Extras opcionales
  sede?: string;
  serieComprobantes?: string;
  numeroComprobanteActual?: number;
  porcentajeProntoPago?: number;
};

const DEFAULT_CFG: BillingConfig = {
  montoBase: 25, // S/25 por quincena = S/50 mensual
  cierreDia: 14,
  vencimientoDia: 15,
  prontoPagoDias: 3,
  recargoMoraPct: 0,
  recargoSancionPct: 0,
  fechaCorteISO: "2025-01-15",
};

const Ctx = createContext<BillingConfig>(DEFAULT_CFG);

export function BillingConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<BillingConfig>(DEFAULT_CFG);

  useEffect(() => {
    const r = ref(db, "cobranzas/configuracion");
    const unsub = onValue(
      r,
      (snap) => {
        const raw = (snap.val() ?? {}) as any;

        // Mapeo de tus claves en español -> claves normalizadas
        // IMPORTANTE: montoBase es por QUINCENA, pero el usuario configura monto MENSUAL
        // Por lo tanto, dividimos el monto mensual entre 2
        const montoMensual = toNum(raw.montoMensual, DEFAULT_CFG.montoBase * 2);
        
        const parsed: BillingConfig = {
          montoBase: montoMensual / 2, // Convertir monto mensual a quincenal
          cierreDia: toNum(raw.diaCierre, DEFAULT_CFG.cierreDia),
          vencimientoDia: toNum(raw.diaVencimiento, DEFAULT_CFG.vencimientoDia),
          prontoPagoDias: toNum(raw.diasProntoPago, DEFAULT_CFG.prontoPagoDias),
          recargoMoraPct: toNum(raw.porcentajeMorosidad, DEFAULT_CFG.recargoMoraPct),
          recargoSancionPct: toNum(raw.porcentajeSancion, DEFAULT_CFG.recargoSancionPct),
          fechaCorteISO: toStr(raw.fechaCorteISO, DEFAULT_CFG.fechaCorteISO),

          // extras
          sede: toStr(raw.sede, undefined),
          serieComprobantes: toStr(raw.serieComprobantes, undefined),
          numeroComprobanteActual: toNum(raw.numeroComprobanteActual, undefined),
          porcentajeProntoPago: toNum(raw.porcentajeProntoPago, undefined),
        };

        setCfg(parsed);
      },
      (err) => {
        console.error("Error leyendo cobranzas/configuracion:", err);
        setCfg(DEFAULT_CFG);
      }
    );
    return () => unsub();
  }, []);

  const value = useMemo(() => cfg, [cfg]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBillingConfig() {
  return useContext(Ctx);
}

// Helpers robustos
function toNum(v: any, fallback: any) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
}
function toStr<T = string>(v: any, fallback: T) {
  return typeof v === "string" && v.trim() ? (v as T) : fallback;
}
