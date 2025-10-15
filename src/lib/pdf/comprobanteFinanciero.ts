// src/pdf/comprobanteFinanciero.ts
import jsPDF from "jspdf";
import { ref as sref, getBlob, getBytes } from "firebase/storage";
import { storage } from "@/config/firebase";

/** Convierte una URL de Firebase Storage (getDownloadURL) a DataURL (base64) vía SDK (evita CORS) */
async function storageUrlToDataURL(url: string): Promise<string> {
  try {
    const r = sref(storage, url);           // admite https de getDownloadURL
    const blob = await getBlob(r);          // camino preferido
    return await blobToDataURL(blob);
  } catch {
    // Fallback si tu versión del SDK no tiene getBlob
    const r = sref(storage, url);
    const bytes = await getBytes(r);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const ext = (url.split("?")[0].split(".").pop() || "jpeg").toLowerCase();
    const mime =
      ext === "png" ? "image/png" :
      ext === "pdf" ? "application/pdf" :
      "image/jpeg";
    return `data:${mime};base64,${base64}`;
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formateaFecha(f: number | string | undefined) {
  if (!f) return "-";
  try {
    const d = typeof f === "number" ? new Date(f) : new Date(f);
    return d.toLocaleDateString();
  } catch {
    return String(f);
  }
}

/**
 * Genera el PDF del comprobante (EGRESO/INGRESO).
 * Devuelve un Blob para que el caller lo descargue.
 */
export async function generarComprobantePDF(egreso: any): Promise<Blob> {
  const doc = new jsPDF();

  // ===== Encabezado =====
  doc.setFontSize(18);
  doc.text("COMPROBANTE FINANCIERO", 105, 30, { align: "center" });

  // ===== Información general =====
  const numeroComprobante =
    egreso?.numeroComprobante ??
    egreso?.nroComprobante ??
    egreso?.nro_comp ??
    egreso?.nro ??
    "";

  const pagadorReceptor =
    egreso?.pagadorReceptor ??
    egreso?.beneficiario ??
    egreso?.pagador ??
    egreso?.receptor ??
    egreso?.paidBy ??
    egreso?.receivedBy ??
    egreso?.proveedor ??
    "";

  const categoria = egreso?.categoria ?? "-";
  const fechaStr = formateaFecha(egreso?.fecha);
  const monto = Number(egreso?.monto ?? 0);

  doc.setFontSize(11);
  doc.text(`Categoría: ${categoria}`, 30, 60);
  doc.text(`Fecha: ${fechaStr}`, 130, 60);
  doc.text(
    `N° Comprobante: ${numeroComprobante ? String(numeroComprobante) : "-"}`,
    30,
    68
  );
  doc.text(
    `Pagador/Receptor: ${pagadorReceptor ? String(pagadorReceptor) : "-"}`,
    130,
    68
  );

  // ===== Descripción y monto =====
  doc.text("DESCRIPCIÓN:", 30, 88);
  doc.text(String(egreso?.descripcion ?? "-"), 30, 96, { maxWidth: 150 });

  doc.setFontSize(16);
  doc.text(`MONTO: S/ ${monto.toFixed(2)}`, 105, 125, { align: "center" });

  // ===== Imagen del comprobante (si existe) =====
  const comp = egreso?.comprobantes?.[0];
  if (comp?.url) {
    try {
      const dataUrl = await storageUrlToDataURL(comp.url);
      const fmt = (comp?.tipo || "").toUpperCase().includes("PNG") ? "PNG" : "JPEG";
      // Ajusta posición/tamaño a tu plantilla
      doc.addImage(dataUrl, fmt as any, 20, 140, 170, 100);
    } catch (e) {
      console.warn("No se pudo cargar la imagen del comprobante:", e);
    }
  }

  // Devuelve el PDF como Blob (para descargar desde el modal)
  return doc.output("blob");
}

// Alias para compatibilidad con código antiguo
export const generarComprobanteFinanciero = generarComprobantePDF;
