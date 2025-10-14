// src/lib/pdfCapture.ts
import { saveReceiptPdf } from "@/services/recibos";

/** ArrayBuffer -> Blob (PDF) */
export function arrayBufferToPdfBlob(buf: ArrayBuffer): Blob {
  return new Blob([buf], { type: "application/pdf" });
}

/** Base64 (sin cabecera) -> Blob (PDF) */
export function base64ToPdfBlob(base64: string): Blob {
  const byteChars = atob(base64);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}

/** Guarda el PDF en RTDB a partir de un Blob */
export async function saveReceiptPdfFromBlob(
  movimientoId: string,
  blob: Blob,
  filename = `Comprobante-${movimientoId}.pdf`,
  meta?: Record<string, any>
) {
  await saveReceiptPdf(movimientoId, blob, filename, meta);
}

/** Guarda el PDF en RTDB a partir de un ArrayBuffer */
export async function saveReceiptPdfFromArrayBuffer(
  movimientoId: string,
  buf: ArrayBuffer,
  filename = `Comprobante-${movimientoId}.pdf`,
  meta?: Record<string, any>
) {
  const blob = arrayBufferToPdfBlob(buf);
  await saveReceiptPdf(movimientoId, blob, filename, meta);
}

/** Guarda el PDF en RTDB a partir de BASE64 (sin encabezado) */
export async function saveReceiptPdfFromBase64(
  movimientoId: string,
  base64: string,
  filename = `Comprobante-${movimientoId}.pdf`,
  meta?: Record<string, any>
) {
  const blob = base64ToPdfBlob(base64);
  await saveReceiptPdf(movimientoId, blob, filename, meta);
}
