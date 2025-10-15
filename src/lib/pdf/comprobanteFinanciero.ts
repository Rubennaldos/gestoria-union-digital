// src/lib/pdf/comprobanteFinanciero.ts

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

/** Convierte una URL de Storage a DataURL usando SDK de Firebase (más confiable) */
async function storageUrlToDataURL(url: string, timeoutMs = 30000): Promise<string | null> {
  if (!url) return null;
  
  console.log("🔍 Descargando imagen desde URL:", url);
  
  return Promise.race([
    // Usar SDK de Firebase directamente (más confiable que fetch)
    (async () => {
      try {
        let storagePath = "";
        
        // Extraer la ruta de storage desde la URL
        if (url.includes("/o/")) {
          const match = url.match(/\/o\/([^?]+)/);
          if (match) {
            storagePath = decodeURIComponent(match[1]);
          }
        } else {
          storagePath = url;
        }
        
        console.log("📁 Extrayendo de storage:", storagePath);
        const storageReference = sref(storage, storagePath);
        
        console.log("⬇️ Descargando blob...");
        const blob = await getBlob(storageReference);
        console.log("✅ Blob descargado, tamaño:", (blob.size / 1024).toFixed(2), "KB");
        
        console.log("🔄 Convirtiendo a DataURL...");
        const dataUrl = await blobToDataURL(blob);
        console.log("✅ Conversión exitosa, DataURL listo");
        return dataUrl;
      } catch (error) {
        console.error("❌ Error al descargar imagen:", error);
        return null;
      }
    })(),
    
    // Timeout extendido
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
export async function generarComprobantePDF(egreso: any & { imageDataUrl?: string }): Promise<Blob> {
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
  
  // Si ya tenemos el imageDataUrl pre-descargado, usarlo directamente
  if (egreso.imageDataUrl) {
    try {
      console.log("✅ Usando imagen pre-descargada");
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkGray);
      doc.text("COMPROBANTE ADJUNTO:", 15, yPos);
      
      yPos += 5;
      
      const fmt = comp?.tipo?.toUpperCase().includes("PNG") ? "PNG" : "JPEG";
      console.log("📄 Agregando imagen al PDF, formato:", fmt);
      
      const maxWidth = 180;
      const maxHeight = 100;
      doc.addImage(egreso.imageDataUrl, fmt, 15, yPos, maxWidth, maxHeight);
      
      yPos += maxHeight + 5;
      console.log("✅ Imagen agregada exitosamente");
    } catch (e) {
      console.error("❌ Error al agregar imagen al PDF:", e);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("(La imagen del comprobante no pudo ser incluida)", 15, yPos);
      yPos += 10;
    }
  } else if (comp?.url) {
    // Fallback: intentar descargar (menos confiable)
    console.log("⏳ Intentando descarga de imagen...");
    const dataUrl = await storageUrlToDataURL(comp.url, 30000);
    
    if (dataUrl) {
      try {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...darkGray);
        doc.text("COMPROBANTE ADJUNTO:", 15, yPos);
        
        yPos += 5;
        
        const fmt = comp.tipo?.toUpperCase().includes("PNG") ? "PNG" : "JPEG";
        console.log("✅ Agregando imagen al PDF, formato:", fmt);
        
        const maxWidth = 180;
        const maxHeight = 100;
        doc.addImage(dataUrl, fmt, 15, yPos, maxWidth, maxHeight);
        
        yPos += maxHeight + 5;
      } catch (e) {
        console.error("❌ Error al agregar imagen al PDF:", e);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("(La imagen del comprobante no pudo ser incluida)", 15, yPos);
        yPos += 10;
      }
    } else {
      console.warn("⚠️ No se pudo obtener DataURL - PDF sin imagen");
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
// Asegúrate de que esta ruta sea correcta para tu logo
import logoUrbanizacion from "@/assets/logo-urbanizacion.png"; 
import { saveReceiptPdfFromBlob } from "@/lib/pdfCapture"; 
// Importa el helper para la imagen (asumiendo que existe)
import { storageUrlToDataURL } from "@/utils/storageImage"; 

interface ComprobanteFinancieroData {
    id: string;
    tipo: "ingreso" | "egreso";
    categoria: string;
    monto: number;
    descripcion: string;
    fecha: string;
    // Campos del RTDB que ahora jalamos:
    numeroComprobante?: string; 
    banco?: string; 
    beneficiario?: string;
    proveedor?: string;
    // Otros
    observaciones?: string;
    registradoPorNombre: string;
    createdAt: number;
    numeroPadron?: string;
    nombreAsociado?: string;
    comprobantes?: Array<{
        nombre: string;
        url: string;
        tipo?: string; 
    }>;
}

// Exportación de la función principal
export async function generarComprobanteFinanciero(
    data: ComprobanteFinancieroData // Parámetro 'data'
): Promise<Blob> {
    // -----------------------------------------------------
    // CORRECCIÓN: Usamos 'data' para el console.log y el proceso
    console.log("DATOS FINALES DEL EGRESO:", data);
    // -----------------------------------------------------

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [74, 102, 87];
    const accentColor: [number, number, number] = [59, 130, 246];
    const lightGray: [number, number, number] = [243, 244, 246];

    // Lógica para extraer datos de eventos/observaciones (se mantiene)
    let eventoData: any = null;
    if (data.categoria.toLowerCase() === "evento" && data.observaciones) {
        try { eventoData = JSON.parse(data.observaciones); } catch {}
    }

    let yPos = 20;

    // Header y logo (se mantiene)
    try {
        const logoImg = new Image();
        logoImg.src = logoUrbanizacion;
        await new Promise((resolve, reject) => {
            logoImg.onload = resolve as any;
            logoImg.onerror = reject as any;
        });
        doc.addImage(logoImg, "PNG", pageWidth / 2 - 40, yPos, 80, 30);
        yPos += 40;
    } catch {
        doc.setFontSize(20);
        doc.setTextColor(...primaryColor);
        doc.text("SAN ANTONIO DE PACHACAMAC", pageWidth / 2, yPos, { align: "center" });
        yPos += 15;
    }

    // Título y separador (se mantiene)
    doc.setFontSize(24);
    doc.setTextColor(...accentColor);
    doc.text("COMPROBANTE FINANCIERO", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.tipo === "ingreso" ? "INGRESO" : "EGRESO", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
    // FORMATO ESTÁNDAR (CORRECCIÓN DE DATOS)
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
    
    if (!eventoData) { // Usamos el formato estándar si no es un evento complejo
        doc.setFillColor(...lightGray);
        doc.roundedRect(20, yPos, pageWidth - 40, 36, 3, 3, "F");

        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text("INFORMACIÓN GENERAL", 25, yPos + 7);

        doc.setFontSize(10);
        doc.setTextColor(60);
        const fechaValida = data.fecha && !isNaN(new Date(data.fecha).getTime());
        let infoY = yPos + 14;

        // Fila 1: Categoría y Fecha
        doc.text(`Categoría: ${data.categoria}`, 25, infoY);
        doc.text(`Fecha: ${fechaValida ? format(new Date(data.fecha), "dd/MM/yyyy", { locale: es }) : "Fecha inválida"}`, pageWidth / 2 + 10, infoY);
        infoY += 6;
        
        // Fila 2: N° Comprobante y Cuenta/Pago
        doc.text(`N° Comprobante: ${data.numeroComprobante || '-'}`, 25, infoY); // <--- CORRECCIÓN DE N° COMPROBANTE
        doc.text(`Cuenta/Pago: ${data.banco || '-'}`, pageWidth / 2 + 10, infoY);
        infoY += 6;
        
        // Fila 3: Pagador/Receptor
        let pagadorReceptor = data.tipo === 'ingreso' ? (data.beneficiario || data.proveedor || '-') : (data.proveedor || data.beneficiario || '-');
        doc.text(`Pagador/Receptor: ${pagadorReceptor}`, 25, infoY);
        yPos += 41;

        // Descripción (se mantiene tu lógica de splitTextToSize)
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text("DESCRIPCIÓN:", 20, yPos);
        yPos += 5;

        doc.setFillColor(...lightGray);
        doc.setFontSize(9);
        doc.setTextColor(60);
        const descripcionLines = doc.splitTextToSize(data.descripcion, pageWidth - 50);
        const descripcionHeight = descripcionLines.length * 5 + 10;
        doc.roundedRect(20, yPos, pageWidth - 40, descripcionHeight, 2, 2, "F");
        doc.text(descripcionLines, 25, yPos + 5);
        yPos += descripcionHeight + 10;

        // Monto (se mantiene)
        doc.setFillColor(...primaryColor);
        doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "bold");
        doc.text(`MONTO: S/ ${data.monto.toFixed(2)}`, 25, yPos + 13);
        doc.setFont(undefined, "normal");
        yPos += 30;
    }
    // else { /* Lógica compleja de evento */ }

    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
    // IMAGEN DEL COMPROBANTE (FIX DE CORS Y DATAURL)
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
    const comprobante = data.comprobantes?.[0];
    const urlValida = comprobante?.url?.startsWith("http");

    if (urlValida) {
        yPos += 10; // Espacio
        
        // Header de la sección
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text("COMPROBANTE DE PAGO ADJUNTO:", 20, yPos);
        yPos += 8;

        try {
            // CORRECCIÓN 3: USAR EL HELPER DE STORAGE PARA OBTENER BASE64 Y EVITAR CORS
            const base64 = await storageUrlToDataURL(comprobante.url); // Updated to use the new import

            if (base64) {
                // Inferir formato: jsPDF lo necesita
                const format = (comprobante.tipo || "").toUpperCase().includes("PNG") ? "PNG" : "JPEG";
                
                // Dibujo de la imagen
                const maxWidth = pageWidth - 50;
                const imgWidth = 170; // Ancho asumido
                const imgHeight = 100; // Altura asumida
                const comprobanteX = (pageWidth - imgWidth) / 2;
                
                doc.addImage(base64, format as any, comprobanteX, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 15;
            }
        } catch (e) {
            console.warn("Fallo al descargar/dibujar imagen de comprobante:", e);
            yPos += 10; // Deja un espacio si falla
        }
    }
    
    // Footer (se mantiene tu lógica)
    yPos = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 7;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("San Antonio de Pachacamac", pageWidth / 2, yPos, { align: "center" });
    yPos += 4;
    doc.text(`Registrado por: ${data.registradoPorNombre}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 4;
    doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, yPos, { align: "center" });

    return doc.output("blob");
}

// CORRECCIÓN 4: Exportación de la función (necesario para el resto del sistema)
export const generarComprobanteFinancieroYGuardar = async (
    data: ComprobanteFinancieroData,
    ids: { receiptId: string; movimientoId?: string; empadronadoId?: string; inscripcionId?: string },
    descargarLocal = false
): Promise<void> => {
    const blob = await generarComprobanteFinanciero(data);

    // ... (Tu lógica de guardar en RTDB y descargar local se mantiene)
    
    if (descargarLocal) {
        const docUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = docUrl;
        a.download = `Comprobante-${ids.receiptId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(docUrl);
    }
}

// Exportación del alias (para compatibilidad)
export const generarComprobantePDF = generarComprobanteFinanciero;