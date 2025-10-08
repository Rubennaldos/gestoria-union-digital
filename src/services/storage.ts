import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

/**
 * Convierte un archivo a base64 para almacenarlo en Firebase RTDB
 */
async function convertirArchivoABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Error al convertir archivo'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Guarda un comprobante de pago en Firebase RTDB (como base64)
 * Alternativa a Firebase Storage para evitar problemas de CORS
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

    // Validar tamaño (max 2MB para RTDB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('El archivo no debe superar los 2MB');
    }

    // Convertir a base64
    const base64Data = await convertirArchivoABase64(file);
    
    // Guardar en RTDB
    const comprobantesRef = ref(db, `cobranzas_v2/comprobantes/${empadronadoId}/${periodo}_${Date.now()}`);
    await set(comprobantesRef, {
      data: base64Data,
      tipo: file.type,
      nombre: file.name,
      tamaño: file.size,
      fechaSubida: Date.now()
    });
    
    // Retornar la ruta en RTDB como "URL"
    return comprobantesRef.toString();
  } catch (error) {
    console.error('Error subiendo comprobante:', error);
    throw error;
  }
}

/**
 * Sube un archivo al Firebase Storage
 * @param file - El archivo a subir
 * @param path - Ruta donde se guardará el archivo
 * @returns URL del archivo subido
 */
export async function uploadFileToStorage(file: File, path: string): Promise<string> {
  try {
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading file to storage:', error);
    throw new Error(`Error al subir archivo: ${error.message}`);
  }
}

/**
 * Sube documentos de personal de seguridad
 */
export async function uploadPersonalSeguridadDocuments(
  empadronadoId: string,
  files: {
    dniFrontal?: File;
    dniReverso?: File;
    reciboLuz?: File;
  }
): Promise<{
  dniFrontalURL?: string;
  dniReversoURL?: string;
  reciboLuzURL?: string;
}> {
  const urls: {
    dniFrontalURL?: string;
    dniReversoURL?: string;
    reciboLuzURL?: string;
  } = {};

  try {
    if (files.dniFrontal) {
      const extension = files.dniFrontal.name.split('.').pop();
      const path = `personal-seguridad/${empadronadoId}/dni-frontal.${extension}`;
      urls.dniFrontalURL = await uploadFileToStorage(files.dniFrontal, path);
    }

    if (files.dniReverso) {
      const extension = files.dniReverso.name.split('.').pop();
      const path = `personal-seguridad/${empadronadoId}/dni-reverso.${extension}`;
      urls.dniReversoURL = await uploadFileToStorage(files.dniReverso, path);
    }

    if (files.reciboLuz) {
      const extension = files.reciboLuz.name.split('.').pop();
      const path = `personal-seguridad/${empadronadoId}/recibo-luz.${extension}`;
      urls.reciboLuzURL = await uploadFileToStorage(files.reciboLuz, path);
    }

    return urls;
  } catch (error: any) {
    console.error('Error uploading personal seguridad documents:', error);
    throw new Error(`Error al subir documentos: ${error.message}`);
  }
}
