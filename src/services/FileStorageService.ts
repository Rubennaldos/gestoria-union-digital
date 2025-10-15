// services/FileStorageService.ts

import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { app } from "@/config/firebase"; // Ruta corregida a la config de firebase

const storage = getStorage(app);

/**
 * Sube un archivo a Firebase Storage y devuelve la URL de descarga.
 * Detecta automáticamente si el archivo es un objeto File o una cadena base64/dataURL.
 *
 * @param file - El archivo a subir (puede ser un objeto File o una cadena base64/dataURL).
 * @param folderName - El nombre de la carpeta en Storage donde se guardará (ej: 'comprobantes', 'eventos').
 * @returns - La URL pública de descarga del archivo.
 */
export const uploadFileAndGetURL = async (file: File | string, folderName: string): Promise<string> => {
  try {
    const fileName = `${new Date().getTime()}_${(typeof file === 'string') ? 'image.png' : file.name}`;
    const storageRef = ref(storage, `${folderName}/${fileName}`);

    console.log(`Subiendo archivo a: ${folderName}/${fileName}`);

    if (typeof file === 'string') {
      await uploadString(storageRef, file, 'data_url');
    } else {
      await uploadBytes(storageRef, file);
    }

    const downloadURL = await getDownloadURL(storageRef);
    console.log('Archivo subido con éxito. URL:', downloadURL);

    return downloadURL;

  } catch (error) {
    console.error("Error al subir el archivo:", error);
    return "";
  }
};
