// src/lib/correlative.ts
import { db } from "@/config/firebase";
import { ref, runTransaction } from "firebase/database";

/**
 * Obtiene el siguiente correlativo seguro (transaccional) en RTDB.
 * Guarda/usa la ruta: counters/<key>
 * Ej.: getNextCorrelative("comprobantes_evento") -> 1, 2, 3, ...
 */
export async function getNextCorrelative(key: string): Promise<number> {
  const txRef = ref(db, `counters/${key}`);
  const result = await runTransaction(txRef, (current) => {
    if (current === null || current === undefined) return 1;
    const n = Number(current) || 0;
    return n + 1;
  });
  return Number(result.snapshot.val() || 1);
}

/**
 * Formatea el correlativo con ceros a la izquierda.
 * Ej.: formatCorrelative(23, 6) -> "000023"
 */
export function formatCorrelative(n: number, digits = 6): string {
  return String(Number(n) || 0).padStart(digits, "0");
}

/**
 * Variante por sede/serie si quieres mantener contadores separados.
 * Guarda la ruta: counters/<key>/<scope>
 * Ej.: getNextCorrelativeScoped("comprobantes_evento", "JP") -> 1,2,3 por serie
 */
export async function getNextCorrelativeScoped(
  key: string,
  scope: string
): Promise<number> {
  const txRef = ref(db, `counters/${key}/${scope}`);
  const result = await runTransaction(txRef, (current) => {
    if (current === null || current === undefined) return 1;
    const n = Number(current) || 0;
    return n + 1;
  });
  return Number(result.snapshot.val() || 1);
}
