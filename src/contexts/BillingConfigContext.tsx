// src/contexts/BillingConfigContext.tsx
// Lee la configuración de cobranzas desde Supabase (tabla cobranzas_configuracion).
// Sin ninguna referencia a Firebase RTDB.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { obtenerConfiguracionV2 } from "@/services/cobranzas-v2";

export type BillingConfig = {
  montoBase: number;          // S/ por MES (monto_mensual en DB)
  cierreDia: number;          // día de cierre del mes
  vencimientoDia: number;     // día de vencimiento visual
  prontoPagoDias: number;     // días de pronto pago
  recargoMoraPct: number;     // % morosidad
  recargoSancionPct: number;  // % sanción (no existe en DB, se usa 0)
  fechaCorteISO: string;      // "YYYY-MM-DD" de corte

  // Extras opcionales
  sede?: string;
  serieComprobantes?: string;
  numeroComprobanteActual?: number;
  porcentajeProntoPago?: number;
};

const DEFAULT_CFG: BillingConfig = {
  montoBase:        50,
  cierreDia:        14,
  vencimientoDia:   15,
  prontoPagoDias:   3,
  recargoMoraPct:   0,
  recargoSancionPct: 0,
  fechaCorteISO:    "2025-01-15",
};

const Ctx = createContext<BillingConfig>(DEFAULT_CFG);

export function BillingConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<BillingConfig>(DEFAULT_CFG);
  const { user, profileLoaded } = useAuth();

  useEffect(() => {
    // Esperar que el perfil cargue antes de consultar
    if (!profileLoaded) return;

    // Sin usuario autenticado → usar configuración por defecto
    if (!user?.uid) {
      setCfg(DEFAULT_CFG);
      return;
    }

    let cancelled = false;

    obtenerConfiguracionV2()
      .then((raw) => {
        if (cancelled) return;
        setCfg({
          montoBase:               raw.montoMensual,
          cierreDia:               raw.diaCierre,
          vencimientoDia:          raw.diaVencimiento,
          prontoPagoDias:          raw.diasProntoPago,
          recargoMoraPct:          raw.porcentajeMorosidad,
          recargoSancionPct:       0,               // campo no existe en Supabase
          fechaCorteISO:           DEFAULT_CFG.fechaCorteISO,
          sede:                    raw.sede,
          serieComprobantes:       raw.serieComprobantes,
          numeroComprobanteActual: raw.numeroComprobanteActual,
          porcentajeProntoPago:    raw.porcentajeProntoPago,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[BillingConfig] Error leyendo configuración desde Supabase:", err?.message);
        setCfg(DEFAULT_CFG);
      });

    return () => { cancelled = true; };
  }, [profileLoaded, user?.uid]);

  const value = useMemo(() => cfg, [cfg]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBillingConfig() {
  return useContext(Ctx);
}
