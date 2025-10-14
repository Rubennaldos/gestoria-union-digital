// src/lib/pdf/receiptEvento.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveReceiptPdfFromBlob } from "@/lib/pdfCapture";

export type EventoReceiptArgs = {
  correlativo: string;
  eventoTitulo: string;
  eventoFechaTexto: string;
  empadronadoNombre: string;
  empadronadoCodigo: string;
  acompanantes: number;
  montoPagado: number;
  metodoPago?: string;
  numeroOperacion?: string;
  observaciones?: string;
  fechaEmision: Date;
  logoBase64?: string; // opcional
};

/** Genera el PDF y devuelve el Blob (NO guarda, NO descarga). */
export async function generarComprobanteEventoPDFBlob(
  args: EventoReceiptArgs
): Promise<Blob> {
  const {
    correlativo,
    eventoTitulo,
    eventoFechaTexto,
    empadronadoNombre,
    empadronadoCodigo,
    acompanantes,
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
  doc.text("Comprobante de Inscripción / Pago de Evento", pageW / 2, 72, {
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
    head: [["Dato", "Valor"]], // ← AQUÍ estaba el corchete extra
    body: [
      ["Correlativo", correlativo],
      ["Fecha de emisión", fechaStr],
      ["Evento", eventoTitulo],
      ["Fecha del evento", eventoFechaTexto],
      ["Empadronado", empadronadoNombre],
      ["Código / Empadronado ID", empadronadoCodigo],
      ["Acompañantes", String(acompanantes)],
      ["Monto pagado (S/)", montoPagado.toFixed(2)],
      ["Método de pago", metodoPago || "—"],
      ["N° Operación", numeroOperacion || "—"],
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
    "Este documento es válido como constancia interna de inscripción y/o pago.",
    40,
    y + 30
  );
  doc.text("Gracias por participar.", 40, y + 48);

  return doc.output("blob");
}

/**
 * Genera, guarda en RTDB y (opcional) descarga el PDF.
 * - receiptId: id en /receipts/<receiptId>
 * - inscripcionId/empadronadoId/movimientoId: índices (opcional)
 */
export default async function generarComprobanteEventoPDF(
  args: EventoReceiptArgs,
  ids?: {
    receiptId: string;
    inscripcionId?: string;
    empadronadoId?: string;
    movimientoId?: string;
  },
  descargarLocal = true
) {
  const blob = await generarComprobanteEventoPDFBlob(args);

  if (ids?.receiptId) {
    await saveReceiptPdfFromBlob(
      ids.receiptId,
      blob,
      `Comprobante-${args.correlativo}.pdf`,
      {
        inscripcionId: ids.inscripcionId,
        empadronadoId: ids.empadronadoId,
        movimientoId: ids.movimientoId,
      }
    );
  }

  if (descargarLocal) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Comprobante-${args.correlativo}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
