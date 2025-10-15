import jsPDF from "jspdf";

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convierte una URL pública a DataURL usando fetch directo */
async function urlToDataURL(url: string): Promise<string | null> {
  if (!url) return null;
  
  console.log("🔍 Descargando imagen desde URL:", url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("❌ Error al descargar:", response.status);
      return null;
    }
    
    const blob = await response.blob();
    console.log("✅ Blob descargado, tamaño:", blob.size);
    
    const dataUrl = await blobToDataURL(blob);
    console.log("✅ Conversión a DataURL exitosa");
    return dataUrl;
  } catch (error) {
    console.error("❌ Error al descargar imagen:", error);
    return null;
  }
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
  console.log("📄 Iniciando generación de PDF para:", egreso);
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
  console.log("🖼️ Comprobante adjunto:", comp);
  
  if (comp?.url) {
    console.log("⏳ Iniciando descarga de imagen...");
    const dataUrl = await urlToDataURL(comp.url);
    
    if (dataUrl) {
      try {
        const fmt = comp.tipo?.toUpperCase().includes("PNG") ? "PNG" : "JPEG";
        console.log("✅ Agregando imagen al PDF, formato:", fmt);
        doc.addImage(dataUrl, fmt, 20, 145, 170, 100);
      } catch (e) {
        console.error("❌ Error al agregar imagen al PDF:", e);
      }
    } else {
      console.warn("⚠️ No se pudo obtener DataURL de la imagen");
    }
  } else {
    console.log("ℹ️ No hay comprobante adjunto");
  }

  console.log("✅ PDF generado exitosamente");
  return doc.output("blob");
}

// Alias para compatibilidad si en algún sitio quedó el nombre viejo
export const generarComprobanteFinanciero = generarComprobantePDF;
