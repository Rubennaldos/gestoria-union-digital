// src/lib/pdf/comprobanteFinanciero.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoUrbanizacion from "@/assets/logo-urbanizacion.png";
import { saveReceiptPdfFromBlob } from "@/lib/pdfCapture";

interface ComprobanteFinancieroData {
  id: string;
  tipo: "ingreso" | "egreso";
  categoria: string;
  monto: number;
  descripcion: string;
  fecha: string;
  numeroComprobante?: string;
  beneficiario?: string;
  proveedor?: string;
  observaciones?: string;
  registradoPorNombre: string;
  createdAt: number;
  banco?: string;
  numeroPadron?: string;
  nombreAsociado?: string;
  comprobantes?: Array<{
    nombre: string;
    url: string;
  }>;
}

export async function generarComprobanteFinanciero(
  data: ComprobanteFinancieroData
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colores corporativos
  const primaryColor: [number, number, number] = [74, 102, 87];
  const accentColor: [number, number, number] = [59, 130, 246];
  const lightGray: [number, number, number] = [243, 244, 246];

  // Intentar extraer información del evento de las observaciones
  let eventoData: any = null;
  if (data.categoria === "Evento" && data.observaciones) {
    try {
      eventoData = JSON.parse(data.observaciones);
    } catch (e) {
      // Si no es JSON válido, continuar sin datos del evento
    }
  }

  let yPos = 20;

  // Header con logo
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
    doc.text("SAN ANTONIO DE PACHACAMAC", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 15;
  }

  // Título del comprobante
  doc.setFontSize(24);
  doc.setTextColor(...accentColor);
  doc.text("COMPROBANTE FINANCIERO", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Tipo de movimiento
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(data.tipo === "ingreso" ? "INGRESO" : "EGRESO", pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += 15;

  // Línea separadora
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Si es un evento con datos, mostrar formato de voucher
  if (eventoData) {
    // Información del Asociado
    const nombreAsociado =
      data.nombreAsociado || eventoData.nombreAsociado || "";
    const numeroPadron = data.numeroPadron || eventoData.numeroPadron || "";

    if (nombreAsociado || numeroPadron) {
      doc.setFillColor(...lightGray);
      doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");

      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text("DATOS DEL ASOCIADO", 25, yPos + 7);

      doc.setFontSize(10);
      doc.setTextColor(60);
      if (nombreAsociado) {
        doc.text(`Nombre: ${nombreAsociado}`, 25, yPos + 14);
      }
      if (numeroPadron) {
        doc.text(`N° Padrón: ${numeroPadron}`, pageWidth / 2 + 10, yPos + 14);
      }
      yPos += 30;
    }

    // Información del Evento
    doc.setFillColor(...lightGray);
    doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, "F");

    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("INFORMACIÓN DEL EVENTO", 25, yPos + 7);

    doc.setFontSize(10);
    doc.setTextColor(60);
    if (eventoData.eventoTitulo) {
      doc.text(`Evento: ${eventoData.eventoTitulo}`, 25, yPos + 14);
    }
    doc.text(`Categoría: ${data.categoria}`, 25, yPos + 20);
    yPos += 35;

    // Personas Inscritas
    if (eventoData.personas && eventoData.personas.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text("PERSONAS INSCRITAS:", 20, yPos);
      yPos += 5;

      const personasHeight = eventoData.personas.length * 7 + 5;
      doc.setFillColor(...lightGray);
      doc.roundedRect(20, yPos, pageWidth - 40, personasHeight, 2, 2, "F");
      yPos += 5;

      doc.setFontSize(9);
      doc.setTextColor(60);
      eventoData.personas.forEach((persona: any, index: number) => {
        doc.text(`${index + 1}. ${persona.nombre} - DNI: ${persona.dni}`, 25, yPos);
        yPos += 7;
      });
      yPos += 8;
    }

    // Sesiones Seleccionadas
    if (eventoData.sesiones && eventoData.sesiones.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text("SESIONES PROGRAMADAS:", 20, yPos);
      yPos += 5;

      const sesionesHeight = eventoData.sesiones.length * 18 + 5;
      doc.setFillColor(...lightGray);
      doc.roundedRect(20, yPos, pageWidth - 40, sesionesHeight, 2, 2, "F");
      yPos += 5;

      doc.setFontSize(9);
      doc.setTextColor(60);
      eventoData.sesiones.forEach((sesion: any, index: number) => {
        doc.text(`${index + 1}. ${sesion.lugar}`, 25, yPos);
        yPos += 5;
        doc.text(
          `   Fecha: ${format(new Date(sesion.fecha), "dd/MM/yyyy", { locale: es })} | Horario: ${sesion.horaInicio} - ${sesion.horaFin}`,
          25,
          yPos
        );
        yPos += 5;
        doc.text(`   Precio: S/ ${sesion.precio.toFixed(2)}`, 25, yPos);
        yPos += 8;
      });
    }

    // Resumen de Pago
    yPos += 5;
    const banco = data.banco || eventoData.banco || "";
    const alturaPago = banco ? 40 : 30;

    doc.setFillColor(...primaryColor);
    doc.roundedRect(20, yPos, pageWidth - 40, alturaPago, 3, 3, "F");

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("RESUMEN DE PAGO", 25, yPos + 8);

    const fechaValida = data.fecha && !isNaN(new Date(data.fecha).getTime());
    doc.setFontSize(10);

    let lineaActual = yPos + 16;
    if (fechaValida) {
      const fechaPago = new Date(data.fecha);
      doc.text(
        `Fecha: ${format(fechaPago, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })}`,
        25,
        lineaActual
      );
      lineaActual += 6;
    }

    if (banco) {
      doc.text(`Banco: ${banco}`, 25, lineaActual);
      lineaActual += 6;
    }

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(`TOTAL: S/ ${data.monto.toFixed(2)}`, 25, lineaActual + 3);
    doc.setFont(undefined, "normal");
    yPos += alturaPago + 10;

    // Número de voucher
    if (eventoData.voucherCode) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Voucher: ${eventoData.voucherCode}`, 25, yPos);
      yPos += 10;
    }
  } else {
    // Formato estándar para otros tipos de movimientos
    doc.setFillColor(...lightGray);
    doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, "F");

    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("INFORMACIÓN GENERAL", 25, yPos + 7);

    doc.setFontSize(10);
    doc.setTextColor(60);
    const fechaValida = data.fecha && !isNaN(new Date(data.fecha).getTime());
    doc.text(`Categoría: ${data.categoria}`, 25, yPos + 14);
    doc.text(
      `Fecha: ${fechaValida ? format(new Date(data.fecha), "dd/MM/yyyy", { locale: es }) : "Fecha inválida"}`,
      25,
      yPos + 20
    );
    yPos += 35;

    // Descripción
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

    // Monto
    doc.setFillColor(...primaryColor);
    doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.text(`MONTO: S/ ${data.monto.toFixed(2)}`, 25, yPos + 13);
    doc.setFont(undefined, "normal");
    yPos += 30;

    if (data.numeroComprobante) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`N° Comprobante: ${data.numeroComprobante}`, 25, yPos);
      yPos += 10;
    }
  }

  // Comprobante de Pago (imagen) - si existe
  if (data.comprobantes && data.comprobantes.length > 0) {
    const espacioNecesario = 100;
    const espacioDisponible = doc.internal.pageSize.getHeight() - yPos - 30;

    if (espacioDisponible < espacioNecesario) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 10;
    }

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("COMPROBANTE DE PAGO ADJUNTO:", 20, yPos);
    yPos += 8;

    try {
      const comprobanteUrl = data.comprobantes[0].url;

      // Convertir la imagen a base64
      const response = await fetch(comprobanteUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const img = new Image();
      img.src = base64;

      await new Promise((resolve) => {
        img.onload = resolve as any;
        img.onerror = resolve as any;
      });

      const maxWidth = pageWidth - 50;
      const maxHeight = 100;

      let imgWidth = img.width;
      let imgHeight = img.height;

      if (imgWidth > 0 && imgHeight > 0) {
        const aspectRatio = imgWidth / imgHeight;

        if (imgWidth > maxWidth) {
          imgWidth = maxWidth;
          imgHeight = imgWidth / aspectRatio;
        }

        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspectRatio;
        }
      } else {
        imgWidth = maxWidth;
        imgHeight = 80;
      }

      const comprobanteX = (pageWidth - imgWidth) / 2;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(comprobanteX - 5, yPos - 5, imgWidth + 10, imgHeight + 10, 3, 3, "F");

      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(comprobanteX - 5, yPos - 5, imgWidth + 10, imgHeight + 10, 3, 3, "S");

      doc.addImage(base64, "JPEG", comprobanteX, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 15;
    } catch {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("(Comprobante adjunto en el registro)", 25, yPos);
      yPos += 10;
    }
  }

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 7;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("San Antonio de Pachacamac", pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  doc.text(`Registrado por: ${data.registradoPorNombre}`, pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += 4;
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, yPos, {
    align: "center",
  });

  return doc.output("blob");
}

/**
 * Variante que guarda el PDF en RTDB y (opcional) lo descarga.
 * - receiptId: id del comprobante en /receipts/<receiptId>
 * - movimientoId/empadronadoId/inscripcionId: índices opcionales
 */
export async function generarComprobanteFinancieroYGuardar(
  data: ComprobanteFinancieroData,
  ids: { receiptId: string; movimientoId?: string; empadronadoId?: string; inscripcionId?: string },
  descargarLocal = false
) {
  const blob = await generarComprobanteFinanciero(data);
  await saveReceiptPdfFromBlob(ids.receiptId, blob, {
    movimientoId: ids.movimientoId,
    empadronadoId: ids.empadronadoId,
    inscripcionId: ids.inscripcionId,
  });
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
