// src/lib/imageCompression.ts

/**
 * Comprime una imagen reduciendo su tamaño si es necesario
 * @param file - Archivo de imagen a comprimir
 * @param maxSizeKB - Tamaño máximo en KB (por defecto 500KB)
 * @param maxWidth - Ancho máximo en px (por defecto 1200px)
 * @returns Blob comprimido
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 500,
  maxWidth: number = 1200
): Promise<Blob> {
  // Si ya es pequeño, retornar tal cual
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo obtener el contexto del canvas'));
      return;
    }

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo proporción
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Intentar diferentes calidades hasta alcanzar el tamaño deseado
      let quality = 0.9;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al generar blob'));
              return;
            }

            // Si ya está en el tamaño objetivo o la calidad es muy baja, retornar
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.3) {
              resolve(blob);
            } else {
              // Reducir calidad y reintentar
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convierte un Blob a base64 (sin el prefijo data:...)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
