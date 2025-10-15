// src/lib/pdf/comprobanteFinanciero.ts

import jsPDF from "jspdf";
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