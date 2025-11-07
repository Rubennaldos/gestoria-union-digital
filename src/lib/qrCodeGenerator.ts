import QRCode from 'qrcode';

export interface DatosVisitaQR {
  id: string;
  tipoAcceso: "vehicular" | "peatonal";
  visitantes: { nombre: string; dni: string }[];
  placas?: string[];
  menores: number;
  fechaCreacion: string;
  tipoRegistro?: "visita" | "alquiler";
}

/**
 * Genera un código QR con los datos de la visita y lo descarga automáticamente
 * como una imagen PNG con información legible.
 */
export async function generarYDescargarQRVisita(datos: DatosVisitaQR): Promise<void> {
  try {
    // Crear el contenido del QR (JSON con todos los datos)
    const contenidoQR = JSON.stringify({
      id: datos.id,
      tipo: datos.tipoAcceso,
      visitantes: datos.visitantes.map(v => ({ n: v.nombre, d: v.dni })),
      placas: datos.placas,
      menores: datos.menores,
      fecha: datos.fechaCreacion
    });

    // Generar el código QR como data URL
    const qrDataURL = await QRCode.toDataURL(contenidoQR, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Crear un canvas para componer la imagen final
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');

    // Dimensiones del canvas
    const canvasWidth = 600;
    const canvasHeight = 900;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Título
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('REGISTRO DE VISITA', canvasWidth / 2, 50);

    // Línea decorativa
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 70);
    ctx.lineTo(canvasWidth - 50, 70);
    ctx.stroke();

    // Información de la visita
    let yPos = 120;
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a4a4a';

    // ID
    ctx.font = 'bold 16px Arial';
    ctx.fillText('ID de Registro:', 50, yPos);
    ctx.font = '16px Arial';
    ctx.fillText(datos.id.substring(0, 20), 200, yPos);
    yPos += 35;

    // Fecha
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Fecha:', 50, yPos);
    ctx.font = '16px Arial';
    ctx.fillText(datos.fechaCreacion, 200, yPos);
    yPos += 35;

    // Tipo de acceso
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Tipo de Acceso:', 50, yPos);
    ctx.font = '16px Arial';
    ctx.fillText(datos.tipoAcceso.toUpperCase(), 200, yPos);
    yPos += 35;

    // Placas (si es vehicular)
    if (datos.placas && datos.placas.length > 0) {
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Placas:', 50, yPos);
      ctx.font = '16px Arial';
      ctx.fillText(datos.placas.join(', '), 200, yPos);
      yPos += 35;
    }

    // Visitantes
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Visitantes:', 50, yPos);
    yPos += 30;
    
    datos.visitantes.forEach((visitante, index) => {
      ctx.font = '14px Arial';
      ctx.fillText(`${index + 1}. ${visitante.nombre}`, 70, yPos);
      yPos += 25;
      ctx.fillText(`   DNI: ${visitante.dni}`, 70, yPos);
      yPos += 30;
    });

    // Menores
    if (datos.menores > 0) {
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Menores:', 50, yPos);
      ctx.font = '16px Arial';
      ctx.fillText(`${datos.menores} menor(es)`, 200, yPos);
      yPos += 35;
    }

    yPos += 20;

    // Cargar y dibujar el QR
    const qrImage = new Image();
    await new Promise((resolve, reject) => {
      qrImage.onload = resolve;
      qrImage.onerror = reject;
      qrImage.src = qrDataURL;
    });

    // Centrar el QR
    const qrSize = 350;
    const qrX = (canvasWidth - qrSize) / 2;
    ctx.drawImage(qrImage, qrX, yPos, qrSize, qrSize);

    yPos += qrSize + 30;

    // Instrucción
    ctx.font = 'italic 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';
    ctx.fillText('Presente este código en la entrada', canvasWidth / 2, yPos);

    // Convertir canvas a blob y descargar
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('No se pudo generar la imagen');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `visita-${datos.id.substring(0, 8)}-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');

  } catch (error) {
    console.error('Error al generar QR:', error);
    throw error;
  }
}
