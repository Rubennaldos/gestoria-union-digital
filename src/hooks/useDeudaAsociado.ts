import { useMemo } from "react";
import { useBillingConfig } from "@/contexts/BillingConfigContext";
import { calcularDeuda } from "@/lib/cobranzas/debt";

type EmpadronadoLike = {
  fechaIngreso?: string | number;
};

function ensureISO(v: string | number | undefined): string {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (typeof v === "string" && /^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  if (typeof v === "number") {
    const d = new Date(v);
    return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function useDeudaAsociado(emp: EmpadronadoLike) {
  const cfg = useBillingConfig();

  return useMemo(() => {
    const fechaIngresoISO = ensureISO(emp?.fechaIngreso);
    const res = calcularDeuda({ fechaIngresoISO }, cfg);
    return {
      ...res,
      esMoroso: res.meses > 0,
    };
  }, [emp?.fechaIngreso, cfg]);
}
