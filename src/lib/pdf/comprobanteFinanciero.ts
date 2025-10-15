import jsPDF from "jspdf";
import { ref as sref, getBlob } from "firebase/storage";
import { storage } from "@/config/firebase";

/** Convierte una URL de Firebase Storage a DataURL (Base64) usando el SDK */
async function storageUrlToDataURL(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    // Extraer la ruta del archivo desde la URL de descarga de Firebase
    let storagePath = url;
    
    // Si es una URL de descarga de Firebase, extraer la ruta
    if (url.includes("firebasestorage.googleapis.com")) {
      const match = url.match(/\/o\/(.+?)\?/);
      if (match && match[1]) {
        storagePath = decodeURIComponent(match[1]);
      }
    }

    // Obtener referencia y descargar el blob usando el SDK
    const storageReference = sref(storage, storagePath);
    const blob = await getBlob(storageReference);
    return await blobToDataURL(blob);
    
  } catch (error) {
    console.warn("No se pudo cargar la imagen del comprobante:", error);
    return null;
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

/** Genera el PDF y devuelve un Blob para descargar. */
export async function generarComprobantePDF(egreso: any): Promise<Blob> {
  const doc = new jsPDF();

  // ===== Encabezado =====
  doc.setFontSize(18);
  doc.text("COMPROBANTE FINANCIERO", 105, 30, { align: "center" });

  // ===== Información general =====
  const numeroComprobante = egreso?.numeroComprobante || egreso?.nroComprobante || "-";
  
  const pagadorReceptor = egreso?.beneficiario || egreso?.proveedor || egreso?.pagadorReceptor || "-";
  
  const banco = egreso?.banco || "";
  const categoria = egreso?.categoria ?? "-";
  const fechaStr = formateaFecha(egreso?.fecha);
  const monto = Number(egreso?.monto ?? 0);

  doc.setFontSize(11);
  doc.text(`Categoría: ${categoria}`, 30, 60);
  doc.text(`Fecha: ${fechaStr}`, 130, 60);
  doc.text(`N° Comprobante: ${numeroComprobante}`, 30, 68);
  doc.text(`Pagador/Receptor: ${pagadorReceptor}`, 30, 76);
  
  if (banco) {
    doc.text(`Banco: ${banco}`, 130, 76);
  }

  // ===== Descripción y monto =====
  doc.text("DESCRIPCIÓN:", 30, 96);
  doc.text(String(egreso?.descripcion ?? "-"), 30, 104, { maxWidth: 150 });

  doc.setFontSize(16);
  doc.text(`MONTO: S/ ${monto.toFixed(2)}`, 105, 130, { align: "center" });

  // ===== Imagen del comprobante =====
  const comp = egreso?.comprobantes?.[0];
  if (comp?.url) {
    const dataUrl = await storageUrlToDataURL(comp.url);
    if (dataUrl) {
      try {
        const fmt = comp.tipo?.toUpperCase().includes("PNG") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt, 20, 145, 170, 100);
      } catch (e) {
        console.warn("Error al agregar imagen al PDF:", e);
      }
    }
  }

  return doc.output("blob");
}

// Alias para compatibilidad si en algún sitio quedó el nombre viejo
export const generarComprobanteFinanciero = generarComprobantePDF;
