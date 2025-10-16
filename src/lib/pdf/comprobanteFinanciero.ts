// src/lib/pdf/comprobanteFinanciero.ts

import jsPDF from "jspdf";
import { ref as sref, getBlob } from "firebase/storage";
import { storage } from "@/config/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoUrbanizacion from "@/assets/logo-urbanizacion.png";

/* ------------------------------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------------------------------*/

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convierte una URL (o ruta) de Firebase Storage a DataURL (Base64) usando el SDK.
 *  Tiene timeout para que el PDF nunca se “cuelgue”.
 */
async function storageUrlToDataURL(url: string, timeoutMs = 30000): Promise<string | null> {
  if (!url) return null;

  return Promise.race([
    (async () => {
      try {
        // Acepta tanto ruta "carpeta/archivo.jpg" como una descarga firmada ".../o/<ruta>?..."
        let storagePath = url;
        const m = url.match(/\/o\/([^?]+)/);
        if (m) storagePath = decodeURIComponent(m[1]);

        const ref = sref(storage, storagePath);
        const blob = await getBlob(ref);
        return await blobToDataURL(blob);
      } catch (err) {
        console.warn("storageUrlToDataURL: fallo al descargar la imagen:", err);
        return null;
      }
    })(),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`storageUrlToDataURL: timeout ${timeoutMs}ms alcanzado`);
        resolve(null);
      }, timeoutMs)
    ),
  ]);
}

function formateaFechaISO(fecha: string | number | Date | undefined): string {
  if (!fecha) return "-";
  try {
    const d = typeof fecha === "number" ? new Date(fecha) : new Date(fecha);
    return format(d, "dd/MM/yyyy", { locale: es });
  } catch {
    return "-";
  }
}

/* ------------------------------------------------------------------------------------------------
 * Tipos
 * ----------------------------------------------------------------------------------------------*/

export interface ComprobanteFinancieroData {
  id: string;
  tipo: "ingreso" | "egreso";
  categoria: string;
  monto: number;
  descripcion: string;
  fecha: string | number | Date;

  // Campos opcionales que jalas del RTDB:
  numeroComprobante?: string;
  banco?: string;
  beneficiario?: string;
  proveedor?: string;

  observaciones?: string;
  registradoPorNombre: string;
  createdAt: number;

  numeroPadron?: string;
  nombreAsociado?: string;

  empadronadoNumeroPadron?: string;
  empadronadoNombres?: string;
  empadronadoDni?: string;

  comprobantes?: Array<{
    nombre: string;
    url: string;   // URL firmada o ruta en storage
    tipo?: string; // mime o extensión
  }>;
}

/* ------------------------------------------------------------------------------------------------
 * Generador principal (nuevo)
 * ----------------------------------------------------------------------------------------------*/

export async function generarComprobanteFinanciero(
  data: ComprobanteFinancieroData,
  opts?: { imageDataUrl?: string; imageTimeoutMs?: number }
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [41, 128, 185]; // azul
  const darkGray: [number, number, number] = [52, 73, 94];
  const lightGray: [number, number, number] = [236, 240, 241];

  let yPos = 15;

  // --- Encabezado con logo ---
  try {
    const img = new Image();
    img.src = logoUrbanizacion;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
    });
    // Logo centrado
    const w = 70;
    const h = 25;
    doc.addImage(img, "PNG", (pageWidth - w) / 2, yPos, w, h);
    yPos += h + 5;
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.setFontSize(18);
    doc.text("SAN ANTONIO DE PACHACAMAC", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 18;
  }

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text("COMPROBANTE FINANCIERO", pageWidth / 2, yPos + 8, { align: "center" });
  yPos += 16;

  // Subtítulo (tipo)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(data.tipo === "ingreso" ? "INGRESO" : "EGRESO", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  // Separador
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.6);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  // --- Información general ---
  doc.setFillColor(...lightGray);
  const blockHeight = 36;
  doc.roundedRect(20, yPos, pageWidth - 40, blockHeight, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text("INFORMACIÓN GENERAL", 25, yPos + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);

  const fechaTxt = formateaFechaISO(data.fecha);
  const leftX = 25;
  const rightX = pageWidth / 2 + 10;
  let gy = yPos + 14;

  doc.text(`Categoría: ${data.categoria || "-"}`, leftX, gy);
  doc.text(`Fecha: ${fechaTxt}`, rightX, gy);
  gy += 6;

  doc.text(`N° Comprobante: ${data.numeroComprobante || "-"}`, leftX, gy);
  doc.text(`Cuenta/Pago: ${data.banco || "-"}`, rightX, gy);
  gy += 6;

  const pagadorReceptor =
    data.tipo === "ingreso"
      ? data.beneficiario || data.proveedor || "-"
      : data.proveedor || data.beneficiario || "-";
  doc.text(`Pagador/Receptor: ${pagadorReceptor}`, leftX, gy);

  yPos += blockHeight + 8;

  // --- Datos del Empadronado ---
  if (data.empadronadoNumeroPadron) {
    doc.setFillColor(...lightGray);
    const empBlockHeight = 26;
    doc.roundedRect(20, yPos, pageWidth - 40, empBlockHeight, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    doc.text("EMPADRONADO", 25, yPos + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);

    let ey = yPos + 14;
    doc.text(`N° Padrón: ${data.empadronadoNumeroPadron}`, leftX, ey);
    doc.text(`DNI: ${data.empadronadoDni || "-"}`, rightX, ey);
    ey += 6;
    doc.text(`Nombres: ${data.empadronadoNombres || "-"}`, leftX, ey);

    yPos += empBlockHeight + 8;
  }

  // --- Descripción ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text("DESCRIPCIÓN:", 20, yPos);
  yPos += 5;

  doc.setFillColor(...lightGray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const descLines = doc.splitTextToSize(String(data.descripcion || "Sin descripción"), pageWidth - 50);
  const descH = descLines.length * 5 + 10;
  doc.roundedRect(20, yPos, pageWidth - 40, descH, 2, 2, "F");
  doc.text(descLines, 25, yPos + 5);
  yPos += descH + 10;

  // --- Observaciones ---
  if (data.observaciones) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    doc.text("OBSERVACIONES:", 20, yPos);
    yPos += 5;

    doc.setFillColor(...lightGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const obsLines = doc.splitTextToSize(String(data.observaciones), pageWidth - 50);
    const obsH = obsLines.length * 5 + 10;
    doc.roundedRect(20, yPos, pageWidth - 40, obsH, 2, 2, "F");
    doc.text(obsLines, 25, yPos + 5);
    yPos += obsH + 10;
  }

  // --- Monto ---
  doc.setFillColor(...primaryColor);
  doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(`MONTO: S/ ${Number(data.monto || 0).toFixed(2)}`, 25, yPos + 13);
  doc.setFont("helvetica", "normal");
  yPos += 28;

  // --- Imagen del comprobante ---
  const comp = data.comprobantes?.[0];
  const timeoutMs = opts?.imageTimeoutMs ?? 30000;

  if (comp?.url || opts?.imageDataUrl) {
    yPos += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkGray);
    doc.text("COMPROBANTE DE PAGO ADJUNTO:", 20, yPos);
    yPos += 6;

    try {
      let dataUrl: string | null | undefined = opts?.imageDataUrl;
      if (!dataUrl && comp?.url) {
        dataUrl = await storageUrlToDataURL(comp.url, timeoutMs);
      }

      if (dataUrl) {
        const formatGuess =
          (comp?.tipo || "").toUpperCase().includes("PNG") ||
          comp?.url?.toLowerCase().endsWith(".png")
            ? "PNG"
            : "JPEG";

        const imgW = Math.min(170, pageWidth - 50);
        const imgH = 100;
        const x = (pageWidth - imgW) / 2;

        doc.addImage(dataUrl, formatGuess as any, x, yPos, imgW, imgH);
        yPos += imgH + 6;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("(Comprobante disponible en el sistema - no incluido en PDF)", 20, yPos);
        yPos += 10;
      }
    } catch (e) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("(La imagen del comprobante no pudo ser incluida)", 20, yPos);
      yPos += 10;
    }
  }

  // --- Pie de página ---
  const footerY = pageHeight - 22;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(20, footerY, pageWidth - 20, footerY);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("San Antonio de Pachacamac", pageWidth / 2, footerY + 6, { align: "center" });
  doc.text(`Registrado por: ${data.registradoPorNombre || "-"}`, pageWidth / 2, footerY + 10, {
    align: "center",
  });
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, footerY + 14, {
    align: "center",
  });

  return doc.output("blob");
}

/* ------------------------------------------------------------------------------------------------
 * Compatibilidad (legacy): acepta el objeto “egreso” anterior
 * ----------------------------------------------------------------------------------------------*/

export async function generarComprobantePDF(egreso: any & { imageDataUrl?: string }): Promise<Blob> {
  // Mapear al nuevo tipo y reutilizar el generador principal
  const data: ComprobanteFinancieroData = {
    id: egreso.id || egreso.key || "sin-id",
    tipo: egreso.tipo === "ingreso" ? "ingreso" : "egreso",
    categoria: egreso.categoria || "Sin categoría",
    monto: Number(egreso.monto ?? 0),
    descripcion: egreso.descripcion || "",
    fecha: egreso.fecha || egreso.createdAt || Date.now(),

    numeroComprobante: egreso.numeroComprobante || egreso.nroComprobante,
    banco: egreso.banco || "",
    beneficiario: egreso.beneficiario || "",
    proveedor: egreso.proveedor || "",

    observaciones: egreso.observaciones || "",
    registradoPorNombre: egreso.registradoPorNombre || "Sistema",
    createdAt: Number(egreso.createdAt ?? Date.now()),

    numeroPadron: egreso.numeroPadron,
    nombreAsociado: egreso.nombreAsociado,

    empadronadoNumeroPadron: egreso.empadronadoNumeroPadron,
    empadronadoNombres: egreso.empadronadoNombres,
    empadronadoDni: egreso.empadronadoDni,

    comprobantes: Array.isArray(egreso.comprobantes) ? egreso.comprobantes : [],
  };

  return generarComprobanteFinanciero(data, {
    imageDataUrl: egreso.imageDataUrl,
  });
}

/* ------------------------------------------------------------------------------------------------
 * Utilidad opcional para descargar localmente
 * ----------------------------------------------------------------------------------------------*/

export const generarComprobanteFinancieroYGuardar = async (
  data: ComprobanteFinancieroData,
  ids: { receiptId: string; movimientoId?: string; empadronadoId?: string; inscripcionId?: string },
  descargarLocal = false
): Promise<void> => {
  const blob = await generarComprobanteFinanciero(data);

  if (descargarLocal) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Comprobante-${ids.receiptId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

// Alias por compatibilidad (si alguna parte del código espera este nombre)
export const generarComprobanteFinancieroAlias = generarComprobanteFinanciero;
