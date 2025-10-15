import jsPDF from "jspdf";
import { ref as sref, getBlob, getBytes } from "firebase/storage";
import { storage } from "@/config/firebase";

/** Intenta convertir una URL de Storage a DataURL (Base64) con varias rutas. Nunca lanza: devuelve null si no puede. */
async function storageUrlToDataURL(url: string): Promise<string | null> {
  // 1) SDK: getBlob
  try {
    const r = sref(storage, url);
    const blob = await getBlob(r);
    return await blobToDataURL(blob);
  } catch (e) {
    // sigue
  }

  // 2) SDK: getBytes (algunas versiones no tienen getBlob)
  try {
    const r = sref(storage, url);
    const bytes = await getBytes(r);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const ext = (url.split("?")[0].split(".").pop() || "jpeg").toLowerCase();
    const mime =
      ext === "png" ? "image/png" :
      ext === "pdf" ? "application/pdf" :
      "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    // sigue
  }

  // 3) Fallback: fetch sin credenciales (evita preflight con Authorization)
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-cache", referrerPolicy: "no-referrer" });
    if (res.ok) {
      const blob = await res.blob();
      return await blobToDataURL(blob);
    }
  } catch (e) {
    // sigue
  }

  // 4) Nada funcionó: devolvemos null para NO bloquear el PDF
  return null;
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

/** Genera el PDF y devuelve un Blob para descargar. */
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
  doc.text(`N° Comprobante: ${numeroComprobante ? String(numeroComprobante) : "-"}`, 30, 68);
  doc.text(`Pagador/Receptor: ${pagadorReceptor ? String(pagadorReceptor) : "-"}`, 130, 68);

  // ===== Descripción y monto =====
  doc.text("DESCRIPCIÓN:", 30, 88);
  doc.text(String(egreso?.descripcion ?? "-"), 30, 96, { maxWidth: 150 });

  doc.setFontSize(16);
  doc.text(`MONTO: S/ ${monto.toFixed(2)}`, 105, 125, { align: "center" });

  // ===== Imagen del comprobante (no bloquea si falla) =====
  try {
    const comp = egreso?.comprobantes?.[0];
    if (comp?.url) {
      const dataUrl = await storageUrlToDataURL(comp.url);
      if (dataUrl) {
        const fmt = (comp?.tipo || "").toUpperCase().includes("PNG") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt as any, 20, 140, 170, 100);
      }
    }
  } catch (e) {
    // Ignoramos imagen para no cortar descarga
    console.warn("Imagen de comprobante omitida:", e);
  }

  return doc.output("blob");
}

// Alias para compatibilidad si en algún sitio quedó el nombre viejo
export const generarComprobanteFinanciero = generarComprobantePDF;
