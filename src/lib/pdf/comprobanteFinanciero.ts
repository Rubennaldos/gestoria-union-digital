import jsPDF from "jspdf";
import { ref as sref, getDownloadURL, getBlob } from "firebase/storage";
import { storage } from "@/config/firebase";

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convierte una URL de Storage a DataURL con múltiples estrategias y timeout */
async function storageUrlToDataURL(url: string, timeoutMs = 5000): Promise<string | null> {
  if (!url) return null;
  
  console.log("🔍 Descargando imagen desde URL:", url);
  
  return Promise.race([
    // Estrategia principal: fetch directo de la URL pública
    (async () => {
      try {
        console.log("⬇️ Intentando descarga directa...");
        const response = await fetch(url, { 
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log("✅ Blob descargado vía fetch, tamaño:", (blob.size / 1024).toFixed(2), "KB");
        
        const dataUrl = await blobToDataURL(blob);
        console.log("✅ Conversión a DataURL exitosa");
        return dataUrl;
      } catch (error) {
        console.warn("⚠️ Fetch directo falló, intentando SDK...", error);
        
        // Fallback: usar SDK de Firebase Storage
        try {
          let storagePath = "";
          if (url.includes("/o/")) {
            const match = url.match(/\/o\/([^?]+)/);
            if (match) {
              storagePath = decodeURIComponent(match[1]);
            }
          } else {
            storagePath = url;
          }
          
          console.log("📁 Ruta de storage:", storagePath);
          const storageReference = sref(storage, storagePath);
          const blob = await getBlob(storageReference);
          console.log("✅ Blob descargado vía SDK, tamaño:", (blob.size / 1024).toFixed(2), "KB");
          
          const dataUrl = await blobToDataURL(blob);
          console.log("✅ Conversión a DataURL exitosa");
          return dataUrl;
        } catch (sdkError) {
          console.error("❌ Error al descargar imagen:", sdkError);
          return null;
        }
      }
    })(),
    
    // Timeout
    new Promise<null>((resolve) => 
      setTimeout(() => {
        console.warn(`⏱️ Timeout de ${timeoutMs}ms alcanzado - continuando sin imagen`);
        resolve(null);
      }, timeoutMs)
    )
  ]);
}

function formateaFecha(f: number | string | undefined) {
  if (!f) return "-";
  try {
    const d = typeof f === "number" ? new Date(f) : new Date(f);
    return d.toLocaleDateString("es-PE", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    });
  } catch {
    return String(f);
  }
}

/** Genera el PDF y devuelve un Blob para descargar. */
export async function generarComprobantePDF(egreso: any): Promise<Blob> {
  console.log("📄 Iniciando generación de PDF para:", egreso);
  const doc = new jsPDF();

  // Colores y configuración
  const primaryColor = [41, 128, 185] as [number, number, number]; // Azul profesional
  const darkGray = [52, 73, 94] as [number, number, number];
  const lightGray = [236, 240, 241] as [number, number, number];

  // ===== ENCABEZADO CON FONDO =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("COMPROBANTE FINANCIERO", 105, 20, { align: "center" });
  
  // Tipo de movimiento
  const tipoLabel = egreso.tipo === "ingreso" ? "INGRESO" : "EGRESO";
  doc.setFontSize(14);
  doc.text(tipoLabel, 105, 32, { align: "center" });

  // ===== INFORMACIÓN GENERAL =====
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  
  const numeroComprobante = egreso?.numeroComprobante || egreso?.nroComprobante || "Sin número";
  const proveedor = egreso?.proveedor || "";
  const beneficiario = egreso?.beneficiario || "";
  const pagadorReceptor = beneficiario || proveedor || "No especificado";
  const banco = egreso?.banco || "";
  const categoria = egreso?.categoria || "Sin categoría";
  const fechaStr = formateaFecha(egreso?.fecha);
  const monto = Number(egreso?.monto ?? 0);
  const observaciones = egreso?.observaciones || "";

  let yPos = 55;

  // Caja de información principal con fondo
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, 180, 60, 3, 3, 'F');
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  
  // Columna izquierda
  doc.text("CATEGORÍA:", 20, yPos);
  doc.text("N° COMPROBANTE:", 20, yPos + 10);
  if (proveedor) doc.text("PROVEEDOR:", 20, yPos + 20);
  if (beneficiario) doc.text("BENEFICIARIO:", 20, yPos + (proveedor ? 30 : 20));
  if (banco) doc.text("BANCO:", 20, yPos + (proveedor && beneficiario ? 40 : proveedor || beneficiario ? 30 : 20));
  
  // Valores columna izquierda
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.text(categoria, 60, yPos);
  doc.text(numeroComprobante, 60, yPos + 10);
  if (proveedor) doc.text(proveedor, 60, yPos + 20, { maxWidth: 55 });
  if (beneficiario) doc.text(beneficiario, 60, yPos + (proveedor ? 30 : 20), { maxWidth: 55 });
  if (banco) doc.text(banco, 60, yPos + (proveedor && beneficiario ? 40 : proveedor || beneficiario ? 30 : 20), { maxWidth: 55 });
  
  // Columna derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("FECHA:", 125, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.text(fechaStr, 145, yPos);

  yPos += 70;

  // ===== DESCRIPCIÓN =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text("DESCRIPCIÓN:", 15, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const descripcion = String(egreso?.descripcion ?? "Sin descripción");
  const splitDesc = doc.splitTextToSize(descripcion, 180);
  doc.text(splitDesc, 15, yPos);
  
  yPos += (splitDesc.length * 5) + 10;

  // ===== OBSERVACIONES (si existen) =====
  if (observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    doc.text("OBSERVACIONES:", 15, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitObs = doc.splitTextToSize(observaciones, 180);
    doc.text(splitObs, 15, yPos);
    
    yPos += (splitObs.length * 4) + 10;
  }

  // ===== MONTO DESTACADO =====
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, 180, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`MONTO: S/ ${monto.toFixed(2)}`, 105, yPos + 16, { align: "center" });

  yPos += 35;

  // ===== IMAGEN DEL COMPROBANTE =====
  const comp = egreso?.comprobantes?.[0];
  console.log("🖼️ Comprobante adjunto:", comp);
  
  if (comp?.url) {
    console.log("⏳ Iniciando descarga de imagen (timeout: 10s)...");
    const dataUrl = await storageUrlToDataURL(comp.url, 10000);
    
    if (dataUrl) {
      try {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...darkGray);
        doc.text("COMPROBANTE ADJUNTO:", 15, yPos);
        
        yPos += 5;
        
        const fmt = comp.tipo?.toUpperCase().includes("PNG") ? "PNG" : "JPEG";
        console.log("✅ Agregando imagen al PDF, formato:", fmt);
        
        // Calcular dimensiones para ajustar la imagen
        const maxWidth = 180;
        const maxHeight = 100;
        doc.addImage(dataUrl, fmt, 15, yPos, maxWidth, maxHeight);
        
        yPos += maxHeight + 5;
      } catch (e) {
        console.error("❌ Error al agregar imagen al PDF:", e);
        // Continuar sin la imagen
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("(La imagen del comprobante no pudo ser incluida)", 15, yPos);
        yPos += 10;
      }
    } else {
      console.warn("⚠️ No se pudo obtener DataURL - PDF sin imagen");
      // Indicar que hay un comprobante pero no se pudo incluir
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("(Comprobante disponible en el sistema - no incluido en PDF)", 15, yPos);
      yPos += 10;
    }
  } else {
    console.log("ℹ️ No hay comprobante adjunto");
  }

  // ===== PIE DE PÁGINA =====
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  const fechaGeneracion = new Date().toLocaleString("es-PE");
  doc.text(`Generado el: ${fechaGeneracion}`, 105, 285, { align: "center" });
  doc.text(`Registrado por: ${egreso?.registradoPorNombre || "Sistema"}`, 105, 290, { align: "center" });

  console.log("✅ PDF generado exitosamente");
  return doc.output("blob");
}

// Alias para compatibilidad si en algún sitio quedó el nombre viejo
export const generarComprobanteFinanciero = generarComprobantePDF;
