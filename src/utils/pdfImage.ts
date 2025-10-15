import { getBlob, ref as storageRef } from "firebase/storage";
import { storage } from "@/config/firebase";

/**
 * Convierte un Blob a DataURL (base64)
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo convertir el blob a DataURL"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Descarga una imagen desde Firebase Storage (usando su URL de Storage, no la de descarga)
 * y la convierte a DataURL (base64) para usar en PDF.
 * @param storageUrl Ruta tipo "cobranzas_v2/comprobantes/empadronadoId/archivo.jpg"
 */
export async function getImageDataURLFromStorageURL(storageUrl: string): Promise<string> {
  const refInStorage = storageRef(storage, storageUrl);
  const blob = await getBlob(refInStorage);
  return blobToDataURL(blob);
}
