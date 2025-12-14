import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";

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
 * Guarda un comprobante de pago en Firebase Storage
 * Usa la misma ubicación para módulo "Mis Cuotas" y "cobranzas-v2"
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

    // Validar tamaño (max 5MB para Storage)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('El archivo no debe superar los 5MB');
    }

    // Importar función de Storage
    const { uploadFileAndGetURL } = await import('@/services/FileStorageService');
    
    // Crear nombre de archivo único: empadronadoId_periodo_timestamp.extensión
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${empadronadoId}_${periodo}_${Date.now()}.${extension}`;
    
    // Subir a Storage en la carpeta comprobantes-pagos
    // Estructura: comprobantes-pagos/{empadronadoId}/{fileName}
    const folderPath = `comprobantes-pagos/${empadronadoId}`;
    const fileWithPath = new File([file], fileName, { type: file.type });
    
    const url = await uploadFileAndGetURL(fileWithPath, folderPath);
    
    if (!url) {
      throw new Error('No se pudo obtener la URL del archivo subido');
    }
    
    console.log('✅ Comprobante subido a Storage:', url);
    return url;
  } catch (error) {
    console.error('Error subiendo comprobante:', error);
    throw error;
  }
}

/**
 * Sube documentos de personal de seguridad a RTDB como base64
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
    // Validar tamaño de archivos
    const maxSize = 2 * 1024 * 1024; // 2MB
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    if (files.dniFrontal) {
      if (!validTypes.includes(files.dniFrontal.type)) {
        throw new Error('DNI frontal: Solo se permiten archivos JPG, PNG o PDF');
      }
      if (files.dniFrontal.size > maxSize) {
        throw new Error('DNI frontal: El archivo no debe superar los 2MB');
      }

      const base64Data = await convertirArchivoABase64(files.dniFrontal);
      const docRef = ref(db, `personal-seguridad/${empadronadoId}/dni-frontal`);
      await set(docRef, {
        data: base64Data,
        tipo: files.dniFrontal.type,
        nombre: files.dniFrontal.name,
        tamaño: files.dniFrontal.size,
        fechaSubida: Date.now()
      });
      urls.dniFrontalURL = `rtdb://personal-seguridad/${empadronadoId}/dni-frontal`;
    }

    if (files.dniReverso) {
      if (!validTypes.includes(files.dniReverso.type)) {
        throw new Error('DNI reverso: Solo se permiten archivos JPG, PNG o PDF');
      }
      if (files.dniReverso.size > maxSize) {
        throw new Error('DNI reverso: El archivo no debe superar los 2MB');
      }

      const base64Data = await convertirArchivoABase64(files.dniReverso);
      const docRef = ref(db, `personal-seguridad/${empadronadoId}/dni-reverso`);
      await set(docRef, {
        data: base64Data,
        tipo: files.dniReverso.type,
        nombre: files.dniReverso.name,
        tamaño: files.dniReverso.size,
        fechaSubida: Date.now()
      });
      urls.dniReversoURL = `rtdb://personal-seguridad/${empadronadoId}/dni-reverso`;
    }

    if (files.reciboLuz) {
      if (!validTypes.includes(files.reciboLuz.type)) {
        throw new Error('Recibo de luz: Solo se permiten archivos JPG, PNG o PDF');
      }
      if (files.reciboLuz.size > maxSize) {
        throw new Error('Recibo de luz: El archivo no debe superar los 2MB');
      }

      const base64Data = await convertirArchivoABase64(files.reciboLuz);
      const docRef = ref(db, `personal-seguridad/${empadronadoId}/recibo-luz`);
      await set(docRef, {
        data: base64Data,
        tipo: files.reciboLuz.type,
        nombre: files.reciboLuz.name,
        tamaño: files.reciboLuz.size,
        fechaSubida: Date.now()
      });
      urls.reciboLuzURL = `rtdb://personal-seguridad/${empadronadoId}/recibo-luz`;
    }

    return urls;
  } catch (error: any) {
    console.error('Error uploading personal seguridad documents:', error);
    throw new Error(`Error al subir documentos: ${error.message}`);
  }
}
