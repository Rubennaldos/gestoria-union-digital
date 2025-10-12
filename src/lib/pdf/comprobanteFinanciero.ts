// src/lib/pdf/comprobanteFinanciero.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const primaryColor: [number, number, number] = [34, 34, 34];
  const accentColor: [number, number, number] = [59, 130, 246];
  const successColor: [number, number, number] = [16, 185, 129];
  const dangerColor: [number, number, number] = [239, 68, 68];

  // Encabezado
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("COMPROBANTE FINANCIERO", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    data.tipo === "ingreso" ? "INGRESO" : "EGRESO",
    pageWidth / 2,
    30,
    { align: "center" }
  );

  let yPos = 50;

  // Información del comprobante
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Información General", 20, yPos);
  
  yPos += 10;

  const infoGeneral = [
    ["Tipo", data.tipo === "ingreso" ? "INGRESO" : "EGRESO"],
    ["Categoría", data.categoria],
    ["Fecha", format(new Date(data.fecha), "dd/MM/yyyy", { locale: es })],
    ["Monto", `S/ ${data.monto.toFixed(2)}`],
  ];

  if (data.numeroComprobante) {
    infoGeneral.push(["N° Comprobante", data.numeroComprobante]);
  }

  if (data.beneficiario) {
    infoGeneral.push(["Beneficiario", data.beneficiario]);
  }

  if (data.proveedor) {
    infoGeneral.push(["Proveedor", data.proveedor]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: infoGeneral,
    theme: "grid",
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: "auto" },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Descripción
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Descripción", 20, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const descripcionLines = doc.splitTextToSize(data.descripcion, pageWidth - 40);
  doc.text(descripcionLines, 20, yPos);
  
  yPos += descripcionLines.length * 5 + 10;

  // Observaciones (si existen)
  if (data.observaciones) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones", 20, yPos);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const observacionesLines = doc.splitTextToSize(data.observaciones, pageWidth - 40);
    doc.text(observacionesLines, 20, yPos);
    
    yPos += observacionesLines.length * 5 + 10;
  }

  // Comprobantes adjuntos
  if (data.comprobantes && data.comprobantes.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Comprobantes Adjuntos", 20, yPos);
    
    yPos += 10;

    const comprobantesData = data.comprobantes.map((comp, index) => [
      `${index + 1}`,
      comp.nombre,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Nombre del archivo"]],
      body: comprobantesData,
      theme: "grid",
      headStyles: {
        fillColor: accentColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: "auto" },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Información de registro
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Registrado por: ${data.registradoPorNombre}`, 20, yPos);
  
  yPos += 5;
  doc.text(
    `Fecha de registro: ${format(new Date(data.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}`,
    20,
    yPos
  );
  
  yPos += 5;
  doc.text(`ID: ${data.id}`, 20, yPos);

  // Pie de página
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(
    `Documento generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    pageWidth / 2,
    pageHeight - 7,
    { align: "center" }
  );

  return doc.output("blob");
}
