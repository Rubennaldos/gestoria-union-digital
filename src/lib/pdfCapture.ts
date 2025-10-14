// src/lib/pdfCapture.ts
import { saveReceiptPdf } from "@/services/recibos";

/** Blob -> dataURL */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

/** ArrayBuffer -> dataURL (PDF) */
export function arrayBufferToPdfDataUrl(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return `data:application/pdf;base64,${base64}`;
}

/** Base64 -> dataURL (PDF) */
export function base64ToPdfDataUrl(base64: string): string {
  return `data:application/pdf;base64,${base64}`;
}

/** Guarda el PDF en RTDB a partir de un Blob */
export async function saveReceiptPdfFromBlob(
  receiptId: string,
  blob: Blob,
  opts?: { inscripcionId?: string; movimientoId?: string; empadronadoId?: string }
) {
  const dataUrl = await blobToDataUrl(blob);
  await saveReceiptPdf(receiptId, dataUrl, opts);
}

/** Guarda el PDF en RTDB a partir de un ArrayBuffer */
export async function saveReceiptPdfFromArrayBuffer(
  receiptId: string,
  buf: ArrayBuffer,
  opts?: { inscripcionId?: string; movimientoId?: string; empadronadoId?: string }
) {
  const dataUrl = arrayBufferToPdfDataUrl(buf);
  await saveReceiptPdf(receiptId, dataUrl, opts);
}

/** Guarda el PDF en RTDB a partir de un base64 (sin encabezado) */
export async function saveReceiptPdfFromBase64(
  receiptId: string,
  base64: string,
  opts?: { inscripcionId?: string; movimientoId?: string; empadronadoId?: string }
) {
  const dataUrl = base64ToPdfDataUrl(base64);
  await saveReceiptPdf(receiptId, dataUrl, opts);
}
