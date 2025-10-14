// src/services/recibos.ts
import { ref, get, set, update } from "firebase/database";
import { db } from "@/config/firebase";

/** Guarda el PDF (dataURL) bajo /receipts/<receiptId> y crea índices auxiliares si se pasan */
export async function saveReceiptPdf(
  receiptId: string,
  dataUrl: string,
  opts?: {
    inscripcionId?: string;
    movimientoId?: string;
    empadronadoId?: string;
  }
): Promise<void> {
  if (!receiptId) throw new Error("receiptId requerido");
  if (!dataUrl?.startsWith("data:application/pdf")) {
    throw new Error("dataUrl inválido: debe ser un data:application/pdf;base64,...");
  }

  const rRef = ref(db, `receipts/${receiptId}`);
  const snap = await get(rRef);

  const base = snap.exists() ? snap.val() : { id: receiptId, createdAt: Date.now() };
  base.pdfDataUrl = dataUrl;
  base.updatedAt = Date.now();

  await set(rRef, base);

  const updates: Record<string, any> = {};
  if (opts?.inscripcionId) {
    updates[`receipts_by_inscripcion/${opts.inscripcionId}`] = receiptId;
  }
  if (opts?.movimientoId) {
    updates[`receipts_by_movimiento/${opts.movimientoId}`] = receiptId;
  }
  if (opts?.empadronadoId) {
    updates[`receipts_index/${opts.empadronadoId}/${receiptId}`] = true;
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

/** Obtiene el dataURL del PDF por receiptId */
export async function getReceiptPdfDataUrl(receiptId: string): Promise<string | null> {
  const snap = await get(ref(db, `receipts/${receiptId}/pdfDataUrl`));
  return snap.exists() ? (snap.val() as string) : null;
}

/** Busca el receiptId por inscripción y devuelve su PDF */
export async function getPdfByInscripcion(inscripcionId: string): Promise<{ receiptId: string; dataUrl: string } | null> {
  const mapSnap = await get(ref(db, `receipts_by_inscripcion/${inscripcionId}`));
  if (!mapSnap.exists()) return null;
  const receiptId = mapSnap.val() as string;
  const dataUrl = await getReceiptPdfDataUrl(receiptId);
  if (!dataUrl) return null;
  return { receiptId, dataUrl };
}

/** Busca el receiptId por movimiento y devuelve su PDF */
export async function getPdfByMovimiento(movimientoId: string): Promise<{ receiptId: string; dataUrl: string } | null> {
  const mapSnap = await get(ref(db, `receipts_by_movimiento/${movimientoId}`));
  if (!mapSnap.exists()) return null;
  const receiptId = mapSnap.val() as string;
  const dataUrl = await getReceiptPdfDataUrl(receiptId);
  if (!dataUrl) return null;
  return { receiptId, dataUrl };
}

/** Utilidad: descarga un dataURL como archivo */
export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Descarga por receiptId */
export async function descargarComprobantePorId(receiptId: string, filename = "comprobante.pdf") {
  const dataUrl = await getReceiptPdfDataUrl(receiptId);
  if (!dataUrl) throw new Error("PDF no encontrado");
  downloadDataUrl(filename, dataUrl);
}

/** Descarga por inscripción */
export async function descargarComprobantePorInscripcion(inscripcionId: string, filename = "comprobante.pdf") {
  const obj = await getPdfByInscripcion(inscripcionId);
  if (!obj) throw new Error("PDF no encontrado para la inscripción");
  downloadDataUrl(filename, obj.dataUrl);
}

/** Descarga por movimiento */
export async function descargarComprobantePorMovimiento(movimientoId: string, filename = "comprobante.pdf") {
  const obj = await getPdfByMovimiento(movimientoId);
  if (!obj) throw new Error("PDF no encontrado para el movimiento");
  downloadDataUrl(filename, obj.dataUrl);
}
