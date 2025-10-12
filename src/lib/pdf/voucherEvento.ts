import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoUrbanizacion from "@/assets/logo-urbanizacion.png";

interface PersonaInscrita {
  nombre: string;
  dni: string;
}

interface SesionSeleccionada {
  lugar: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  precio: number;
}

interface VoucherData {
  eventoTitulo: string;
  eventoCategoria: string;
  personas: PersonaInscrita[];
  sesiones: SesionSeleccionada[];
  montoTotal: number;
  fechaPago: Date;
  numeroVoucher: string;
  comprobanteBase64?: string;
}

export const generarVoucherEvento = async (data: VoucherData): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colores corporativos
  const primaryColor: [number, number, number] = [74, 102, 87]; // Verde de las montañas
  const accentColor: [number, number, number] = [59, 130, 246]; // Azul
  const lightGray: [number, number, number] = [243, 244, 246];
  
  let yPos = 20;

  // Header con logo
  try {
    const logoImg = new Image();
    logoImg.src = logoUrbanizacion;
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
    });
    doc.addImage(logoImg, 'PNG', pageWidth / 2 - 40, yPos, 80, 30);
    yPos += 40;
  } catch (error) {
    // Si falla cargar el logo, continuar sin él
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    doc.text("SAN ANTONIO DE PACHACAMAC", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;
  }

  // Título del voucher
  doc.setFontSize(24);
  doc.setTextColor(...accentColor);
  doc.text("COMPROBANTE DE INSCRIPCIÓN", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Número de voucher
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`N° ${data.numeroVoucher}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Línea separadora
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Información del Evento
  doc.setFillColor(...lightGray);
  doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("INFORMACIÓN DEL EVENTO", 25, yPos + 7);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Evento: ${data.eventoTitulo}`, 25, yPos + 14);
  doc.text(`Categoría: ${data.eventoCategoria}`, 25, yPos + 20);
  yPos += 35;

  // Personas Inscritas
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("PERSONAS INSCRITAS:", 20, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setTextColor(60);
  data.personas.forEach((persona, index) => {
    doc.text(`${index + 1}. ${persona.nombre} - DNI: ${persona.dni}`, 25, yPos);
    yPos += 6;
  });
  yPos += 5;

  // Sesiones Seleccionadas
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("SESIONES PROGRAMADAS:", 20, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setTextColor(60);
  data.sesiones.forEach((sesion, index) => {
    doc.text(`${index + 1}. ${sesion.lugar}`, 25, yPos);
    yPos += 5;
    doc.text(`   Fecha: ${format(new Date(sesion.fecha), "dd/MM/yyyy", { locale: es })} | Horario: ${sesion.horaInicio} - ${sesion.horaFin}`, 25, yPos);
    yPos += 5;
    doc.text(`   Precio: S/ ${sesion.precio.toFixed(2)}`, 25, yPos);
    yPos += 7;
  });

  // Resumen de Pago
  yPos += 5;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("RESUMEN DE PAGO", 25, yPos + 8);
  
  doc.setFontSize(10);
  doc.text(`Fecha de pago: ${format(data.fechaPago, "dd/MM/yyyy", { locale: es })}`, 25, yPos + 16);
  
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL: S/ ${data.montoTotal.toFixed(2)}`, 25, yPos + 25);
  doc.setFont(undefined, 'normal');
  yPos += 40;

  // Comprobante de Pago (si existe)
  if (data.comprobanteBase64) {
    yPos += 5;
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("COMPROBANTE DE PAGO:", 20, yPos);
    yPos += 7;
    
    try {
      // Agregar imagen del comprobante
      const maxWidth = pageWidth - 80;
      const maxHeight = 80;
      doc.addImage(data.comprobanteBase64, 'JPEG', pageWidth / 2 - maxWidth / 2, yPos, maxWidth, maxHeight);
      yPos += maxHeight + 10;
    } catch (error) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("(Comprobante adjunto)", 25, yPos);
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
  yPos += 5;
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, yPos, { align: "center" });

  return doc.output('blob');
};

// Función auxiliar para convertir archivo a base64
export const archivoABase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
