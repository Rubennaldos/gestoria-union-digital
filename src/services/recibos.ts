// src/services/recibos.ts
import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";

/** Registro de PDF en RTDB */
export type PdfRecord = {
  filename: string;
  mime: string;        // p.ej. "application/pdf"
  size: number;        // bytes
  base64: string;      // SIN el prefijo "data:...;base64,"
  createdAt: number;   // ms epoch
  meta?: Record<string, any>;
};

/* -------------------- Helpers (browser) -------------------- */

function ensureAtob() {
  if (typeof atob !== "function") {
    throw new Error("atob no está disponible en este entorno.");
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string; // "data:application/pdf;base64,AAAA..."
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, mime = "application/pdf"): Blob {
  ensureAtob();
  const byteChars = atob(b64);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================
   MOVIMIENTOS (comprobantes financieros)
   Path en RTDB: pdf/receipts/{movimientoId}
   ============================================================ */

/** Guarda el PDF del movimiento en RTDB (base64). */
export async function saveReceiptPdf(
  movimientoId: string,
  blob: Blob,
  filename = `Comprobante-${movimientoId}.pdf`,
  meta?: Record<string, any>
): Promise<void> {
  const base64 = await blobToBase64(blob);
  const nodeRef = ref(db, `pdf/receipts/${movimientoId}`);
  const record: PdfRecord = {
    filename,
    mime: "application/pdf",
    size: blob.size,
    base64,
    createdAt: Date.now(),
    meta,
  };
  await set(nodeRef, record);
}

/** Obtiene el PDF del movimiento como Blob (o null si no existe). */
export async function getReceiptPdf(movimientoId: string): Promise<Blob | null> {
  const snap = await get(ref(db, `pdf/receipts/${movimientoId}`));
  if (!snap.exists()) return null;
  const data = snap.val() as PdfRecord;
  return base64ToBlob(data.base64, data.mime);
}

/** Descarga el PDF del movimiento (si existe). */
export async function descargarComprobantePorMovimiento(
  movimientoId: string,
  filename = `Comprobante-${movimientoId}.pdf`
): Promise<void> {
  const blob = await getReceiptPdf(movimientoId);
  if (!blob) throw new Error("PDF no encontrado para el movimiento.");
  descargarBlob(blob, filename);
}

/* ============================================================
   INSCRIPCIONES (voucher/constancia del evento)
   Path en RTDB: pdf/vouchers/{inscripcionId}
   ============================================================ */

/** Guarda el PDF de la inscripción en RTDB (base64). */
export async function saveVoucherPdf(
  inscripcionId: string,
  blob: Blob,
  filename = `Comprobante-${inscripcionId}.pdf`,
  meta?: Record<string, any>
): Promise<void> {
  const base64 = await blobToBase64(blob);
  const nodeRef = ref(db, `pdf/vouchers/${inscripcionId}`);
  const record: PdfRecord = {
    filename,
    mime: "application/pdf",
    size: blob.size,
    base64,
    createdAt: Date.now(),
    meta,
  };
  await set(nodeRef, record);
}

/** Obtiene el PDF de la inscripción como Blob (o null si no existe). */
export async function getVoucherPdf(inscripcionId: string): Promise<Blob | null> {
  const snap = await get(ref(db, `pdf/vouchers/${inscripcionId}`));
  if (!snap.exists()) return null;
  const data = snap.val() as PdfRecord;
  return base64ToBlob(data.base64, data.mime);
}

/** Descarga el PDF de la inscripción (si existe). */
export async function descargarComprobantePorInscripcion(
  inscripcionId: string,
  filename = `Comprobante-${inscripcionId}.pdf`
): Promise<void> {
  const blob = await getVoucherPdf(inscripcionId);
  if (!blob) throw new Error("PDF no encontrado para la inscripción.");
  descargarBlob(blob, filename);
}
