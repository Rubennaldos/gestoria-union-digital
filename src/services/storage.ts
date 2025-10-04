import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase";

/**
 * Sube un archivo de comprobante de pago a Firebase Storage
 */
export async function subirComprobanteCobranza(
  empadronadoId: string,
  periodo: string,
  file: File
): Promise<string> {
  try {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Solo se permiten archivos JPG, PNG o PDF');
    }

    // Validar tamaño (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('El archivo no debe superar los 5MB');
    }

    // Crear referencia única
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `comprobantes/${empadronadoId}/${periodo}_${timestamp}.${extension}`;
    
    const fileRef = storageRef(storage, fileName);
    
    // Subir archivo
    await uploadBytes(fileRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error subiendo comprobante:', error);
    throw error;
  }
}
