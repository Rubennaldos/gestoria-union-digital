import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Convierte una imagen (ruta pública) a dataURL para incrustar en el PDF
async function urlToDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export type ComprobanteEventoInput = {
  // Branding / emisor
  emisorNombre: string;      // "Asociación Junta de Propietarios San Antonio de Pachacámac"
  emisorRuc?: string;
  emisorDireccion?: string;
  emisorTelefono?: string;

  // Logo en /public (por ejemplo /logo-jpusap.png)
  logoPublicPath?: string;   // "/logo-jpusap.png"

  // Comprobante
  serie: string;             // "JP"
  numero: string;            // "000123"

  // Evento
  eventoTitulo: string;
  eventoFecha: string;       // "11/10/2025 10:00"
  sesionSeleccionada?: string;  // opcional

  // Inscripción / pagador
  titularNombre: string;     // Nombre empadronado o titular
  titularDni?: string;
  acompanantes?: number;
  observaciones?: string;

  // Importes
  moneda?: "PEN" | "USD";
  montoTotal: number;
  descuento?: number;  // opcional
  montoPagado?: number; // opcional

  // Fecha de emisión
  fechaEmision?: Date;
};

export async function generarComprobanteInscripcionPDF(data: ComprobanteEventoInput): Promise<Blob> {
  const doc = new jsPDF("p", "pt", "a4");
  const marginX = 40;
  let cursorY = 40;

  // Logo
  try {
    const logoPath = data.logoPublicPath || "/logo-jpusap.png";
    const dataUrl = await urlToDataURL(logoPath);
    doc.addImage(dataUrl, "PNG", marginX, cursorY, 120, 60);
  } catch {
    // sin logo no pasa nada
  }

  // Emisor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.emisorNombre, marginX + 140, cursorY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let emisorLineY = cursorY + 32;
  if (data.emisorRuc) {
    doc.text(`RUC: ${data.emisorRuc}`, marginX + 140, emisorLineY);
    emisorLineY += 14;
  }
  if (data.emisorDireccion) {
    doc.text(data.emisorDireccion, marginX + 140, emisorLineY);
    emisorLineY += 14;
  }
  if (data.emisorTelefono) {
    doc.text(`Tel: ${data.emisorTelefono}`, marginX + 140, emisorLineY);
    emisorLineY += 14;
  }

  // Caja del comprobante (serie / número)
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(1);
  doc.rect(380, cursorY, 170, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("COMPROBANTE", 465, cursorY + 20, { align: "center" });
  doc.setFontSize(11);
  doc.text(`${data.serie}-${data.numero}`, 465, cursorY + 40, { align: "center" });

  cursorY += 80;

  // Datos del evento
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Evento", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  cursorY += 16;
  doc.text(`Título: ${data.eventoTitulo}`, marginX, cursorY);
  cursorY += 14;
  doc.text(`Fecha: ${data.eventoFecha}`, marginX, cursorY);
  cursorY += 14;
  if (data.sesionSeleccionada) {
    doc.text(`Sesión: ${data.sesionSeleccionada}`, marginX, cursorY);
    cursorY += 14;
  }

  cursorY += 8;

  // Titular / participante
  doc.setFont("helvetica", "bold");
  doc.text("Datos del titular", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  cursorY += 16;
  doc.text(`Nombre: ${data.titularNombre}`, marginX, cursorY);
  cursorY += 14;
  if (data.titularDni) {
    doc.text(`DNI: ${data.titularDni}`, marginX, cursorY);
    cursorY += 14;
  }
  if (data.acompanantes !== undefined) {
    doc.text(`Acompañantes: ${data.acompanantes}`, marginX, cursorY);
    cursorY += 14;
  }
  if (data.observaciones) {
    doc.text(`Obs: ${data.observaciones}`, marginX, cursorY, { maxWidth: 500 });
    cursorY += 28;
  } else {
    cursorY += 8;
  }

  // Tabla de importes
  autoTable(doc, {
    startY: cursorY,
    head: [["Descripción", "Monto"]],
    body: [
      ["Inscripción al evento", formatoMoneda(data.montoTotal, data.moneda)],
      ...(data.descuento ? [["Descuento", `- ${formatoMoneda(data.descuento, data.moneda)}`]] : []),
      ...(data.montoPagado !== undefined ? [["Monto pagado", formatoMoneda(data.montoPagado, data.moneda)]] : [])
    ],
    headStyles: { fillColor: [28, 74, 141] },
    styles: { halign: "right" },
    columnStyles: { 0: { halign: "left" } }
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY || cursorY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    `TOTAL: ${formatoMoneda(
      (data.montoPagado ?? data.montoTotal) - (data.descuento ?? 0),
      data.moneda
    )}`,
    520,
    finalY + 30,
    { align: "right" }
  );

  // Fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const fe = data.fechaEmision || new Date();
  doc.text(
    `Emitido: ${fe.toLocaleDateString("es-PE")} ${fe.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`,
    marginX,
    finalY + 30
  );

  // Salida como Blob (lo descarga quien llama)
  return doc.output("blob");
}

function formatoMoneda(n: number, m: "PEN" | "USD" = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: m }).format(n);
}
