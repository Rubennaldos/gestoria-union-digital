// src/lib/pdf/receiptReserva.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveReceiptPdfFromBlob } from "@/lib/pdfCapture";

export type ReservaReceiptArgs = {
  correlativo: string;
  cancha: string;
  ubicacion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracion: number;
  conLuz: boolean;
  cliente: string;
  dni?: string;
  telefono: string;
  montoPagado: number;
  metodoPago: string;
  numeroOperacion?: string;
  observaciones?: string;
  fechaEmision: Date;
  logoBase64?: string;
};

/** Genera el PDF y devuelve el Blob */
export async function generarComprobanteReservaPDFBlob(
  args: ReservaReceiptArgs
): Promise<Blob> {
  const {
    correlativo,
    cancha,
    ubicacion,
    fecha,
    horaInicio,
    horaFin,
    duracion,
    conLuz,
    cliente,
    dni,
    telefono,
    montoPagado,
    metodoPago,
    numeroOperacion,
    observaciones,
    fechaEmision,
    logoBase64,
  } = args;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Encabezado
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 40, 36, 80, 60);
    } catch {
      /* ignorar */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    "Asociación Junta de Propietarios San Antonio de Pachacámac",
    pageW / 2,
    52,
    { align: "center" }
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Comprobante de Reserva de Cancha Deportiva", pageW / 2, 72, {
    align: "center",
  });

  // Datos principales
  const fechaStr = new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fechaEmision);

  autoTable(doc, {
    startY: 110,
    head: [["Dato", "Valor"]],
    body: [
      ["N° Comprobante", correlativo],
      ["Fecha de emisión", fechaStr],
      ["Cancha", cancha],
      ["Ubicación", ubicacion],
      ["Fecha de reserva", fecha],
      ["Horario", `${horaInicio} - ${horaFin}`],
      ["Duración", `${duracion} hora(s)`],
      ["Con iluminación", conLuz ? "Sí" : "No"],
      ["Cliente", cliente],
      ["DNI", dni || "—"],
      ["Teléfono", telefono],
      ["Monto pagado (S/)", montoPagado.toFixed(2)],
      ["Método de pago", metodoPago],
      ["N° Operación", numeroOperacion || "S/N"],
      ["Observaciones", observaciones || "—"],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [20, 23, 38] },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: pageW - 180 - 80 } },
    margin: { left: 40, right: 40 },
  });

  // Pie
  const y = (doc as any).lastAutoTable?.finalY ?? 110;
  doc.setFontSize(10);
  doc.text(
    "Este documento es válido como constancia de reserva y pago.",
    40,
    y + 30
  );
  doc.text("Debes presentar este comprobante el día de tu reserva.", 40, y + 48);
  doc.text("Gracias por tu preferencia.", 40, y + 66);

  return doc.output("blob");
}

/**
 * Genera, guarda en RTDB y (opcional) descarga el PDF.
 */
export default async function generarComprobanteReservaPDF(
  args: ReservaReceiptArgs,
  ids?: {
    receiptId: string;
    reservaId?: string;
    empadronadoId?: string;
    movimientoId?: string;
  },
  descargarLocal = true
) {
  const blob = await generarComprobanteReservaPDFBlob(args);

  if (ids?.receiptId) {
    await saveReceiptPdfFromBlob(
      ids.receiptId,
      blob,
      `Comprobante-Reserva-${args.correlativo}.pdf`,
      {
        reservaId: ids.reservaId,
        empadronadoId: ids.empadronadoId,
        movimientoId: ids.movimientoId,
      }
    );
  }

  if (descargarLocal) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Comprobante-Reserva-${args.correlativo}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}