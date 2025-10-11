// src/lib/pdf/receiptEvento.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Genera y descarga un comprobante PDF de inscripción a evento.
 * NO usa Storage. El PDF se construye y se descarga en el cliente.
 *
 * @param args Datos mínimos necesarios para el comprobante
 */
export async function generarComprobanteEventoPDF(args: {
  correlativo: string;               // p.ej. "EV-000123"
  eventoTitulo: string;
  eventoFechaTexto: string;          // ej "10/11/2025 19:00"
  empadronadoNombre: string;         // titular
  empadronadoCodigo: string;         // código/ID/ padrón
  acompanantes: number;
  montoPagado: number;               // S/
  metodoPago: "efectivo" | "transferencia" | "yape" | "plin";
  numeroOperacion?: string;
  observaciones?: string;
  fechaEmision: Date;                // new Date()
  logoBase64?: string;               // opcional: dataURL del logo (PNG/JPG)
}) {
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

  // Helpers
  const PEN = (n: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ===== Encabezado =====
  // Logo (si lo envías en base64)
  const y0 = 32;
  if (logoBase64) {
    try {
      // ancho máximo 120px, alto máximo 60px
      doc.addImage(logoBase64, "PNG", 40, y0, 120, 60, undefined, "SLOW");
    } catch {
      // si falla, continuar sin logo
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ASOCIACIÓN - JUNTA DE PROPIETARIOS SAN ANTONIO DE PACHACÁMAC", pageW / 2, y0 + 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Rubro: Gestión y administración vecinal", pageW / 2, y0 + 30, { align: "center" });

  // Caja de comprobante
  const boxW = 210;
  const boxH = 46;
  const boxX = pageW - boxW - 40;
  const boxY = y0 + 10;

  doc.setDrawColor(60);
  doc.setLineWidth(0.8);
  doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("COMPROBANTE DE INSCRIPCIÓN", boxX + boxW / 2, boxY + 16, { align: "center" });
  doc.setTextColor(200, 30, 30);
  doc.setFontSize(13);
  doc.text(`# ${correlativo}`, boxX + boxW / 2, boxY + 34, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // ===== Datos de emisión =====
  let y = y0 + 90;
  doc.setFontSize(10);
  doc.text(`Fecha de emisión: ${formatearFecha(fechaEmision)}`, 40, y);
  y += 18;

  // ===== Datos del titular =====
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Empadronado", 40, y);
  doc.setFont("helvetica", "normal");

  autoTable(doc, {
    startY: y + 8,
    styles: { fontSize: 10, halign: "left", cellPadding: 6 },
    theme: "plain",
    columnStyles: { 0: { fontStyle: "bold", textColor: [60, 60, 60] } },
    body: [
      ["Nombre", empadronadoNombre],
      ["Código/Registro", empadronadoCodigo],
      ["Acompañantes", String(acompanantes)],
    ],
  });

  // ===== Datos del evento =====
  let after = (doc as any).lastAutoTable?.finalY ?? y + 8;
  after += 14;

  doc.setFont("helvetica", "bold");
  doc.text("Detalle del Evento", 40, after);
  doc.setFont("helvetica", "normal");

  autoTable(doc, {
    startY: after + 8,
    styles: { fontSize: 10, cellPadding: 6 },
    theme: "striped",
    headStyles: { fillColor: [230, 242, 235], textColor: [0, 0, 0] },
    head: [["Evento", "Fecha/Hora"]],
    body: [[eventoTitulo, eventoFechaTexto]],
  });

  // ===== Pago =====
  after = (doc as any).lastAutoTable?.finalY ?? after + 8;
  after += 14;

  doc.setFont("helvetica", "bold");
  doc.text("Información de Pago", 40, after);
  doc.setFont("helvetica", "normal");

  const pagoRows = [
    ["Monto pagado", PEN(montoPagado)],
    ["Método", capitalize(metodoPago)],
  ] as (string | number)[][];

  if (numeroOperacion) pagoRows.push(["N° Operación", numeroOperacion]);

  autoTable(doc, {
    startY: after + 8,
    styles: { fontSize: 10, cellPadding: 6 },
    theme: "plain",
    columnStyles: { 0: { fontStyle: "bold", textColor: [60, 60, 60] } },
    body: pagoRows as any,
  });

  // ===== Observaciones =====
  after = (doc as any).lastAutoTable?.finalY ?? after + 8;
  if (observaciones && observaciones.trim()) {
    after += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones", 40, after);
    doc.setFont("helvetica", "normal");
    const maxWidth = pageW - 80;
    const lines = doc.splitTextToSize(observaciones, maxWidth);
    doc.text(lines, 40, after + 16);
    after = after + 16 + lines.length * 12;
  }

  // ===== Pie =====
  after += 24;
  doc.setDrawColor(200);
  doc.line(40, after, pageW - 40, after);
  after += 14;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Este comprobante acredita la inscripción al evento. Guárdelo para cualquier validación posterior.",
    40,
    after
  );
  doc.setTextColor(0);

  // Descargar
  const fileName = `Comprobante_${correlativo}.pdf`;
  doc.save(fileName);
}

// =====================
// Utils locales
// =====================
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatearFecha(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
