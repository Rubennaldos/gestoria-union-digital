// services/migrarComprobantesRTDBaStorage.ts
// Función para migrar comprobantes de RTDB a Firebase Storage

import { ref, get, remove } from "firebase/database";
import { db } from "@/config/firebase";
import { uploadFileAndGetURL } from "@/services/FileStorageService";
import { obtenerPagosV2 } from "@/services/cobranzas-v2";
import { update } from "firebase/database";

/**
 * Convierte base64 a Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64.split(',')[1] || base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Migra un comprobante desde RTDB a Storage
 */
async function migrarComprobante(
  rtdbPath: string,
  empadronadoId: string,
  periodo: string
): Promise<string | null> {
  try {
    // Obtener datos del comprobante desde RTDB
    const comprobanteRef = ref(db, rtdbPath);
    const snapshot = await get(comprobanteRef);
    
    if (!snapshot.exists()) {
      console.warn(`Comprobante no encontrado en RTDB: ${rtdbPath}`);
      return null;
    }
    
    const data = snapshot.val();
    if (!data.data) {
      console.warn(`Comprobante sin datos: ${rtdbPath}`);
      return null;
    }
    
    // Convertir base64 a Blob
    const blob = base64ToBlob(data.data, data.tipo || 'image/jpeg');
    
    // Crear File desde Blob
    const extension = data.nombre?.split('.').pop() || 
                     (data.tipo?.includes('pdf') ? 'pdf' : 'jpg');
    const fileName = `${empadronadoId}_${periodo}_${Date.now()}.${extension}`;
    const file = new File([blob], fileName, { type: data.tipo || 'image/jpeg' });
    
    // Subir a Storage
    const folderPath = `comprobantes-pagos/${empadronadoId}`;
    const storageUrl = await uploadFileAndGetURL(file, folderPath);
    
    if (!storageUrl) {
      console.error(`Error subiendo comprobante a Storage: ${rtdbPath}`);
      return null;
    }
    
    console.log(`✅ Migrado: ${rtdbPath} -> ${storageUrl}`);
    return storageUrl;
    
  } catch (error) {
    console.error(`Error migrando comprobante ${rtdbPath}:`, error);
    return null;
  }
}

/**
 * Migra todos los comprobantes de RTDB a Storage y actualiza los pagos
 */
export async function migrarTodosComprobantesRTDBaStorage(): Promise<{
  total: number;
  migrados: number;
  errores: number;
  detalles: string[];
}> {
  const detalles: string[] = [];
  let migrados = 0;
  let errores = 0;
  
  try {
    // Obtener todos los pagos
    const pagos = await obtenerPagosV2();
    detalles.push(`Total de pagos encontrados: ${pagos.length}`);
    
    // Filtrar pagos con comprobantes en RTDB
    const pagosConComprobanteRTDB = pagos.filter(p => 
      p.archivoComprobante && 
      (p.archivoComprobante.includes('cobranzas_v2/comprobantes') || 
       p.archivoComprobante.includes('firebaseio.com'))
    );
    
    detalles.push(`Pagos con comprobantes en RTDB: ${pagosConComprobanteRTDB.length}`);
    
    // Migrar cada comprobante
    for (const pago of pagosConComprobanteRTDB) {
      try {
        let rtdbPath = pago.archivoComprobante;
        
        // Extraer ruta de RTDB
        if (rtdbPath.includes('firebaseio.com')) {
          const match = rtdbPath.match(/cobranzas_v2\/comprobantes\/[^.]+/);
          if (match) {
            rtdbPath = match[0];
          }
        }
        
        // Migrar comprobante
        const storageUrl = await migrarComprobante(
          rtdbPath,
          pago.empadronadoId,
          pago.periodo
        );
        
        if (storageUrl) {
          // Actualizar el pago con la nueva URL de Storage
          const pagoRef = ref(db, `cobranzas_v2/pagos/${pago.id}`);
          await update(pagoRef, {
            archivoComprobante: storageUrl
          });
          
          // Opcional: Eliminar de RTDB después de migrar (descomentar si se desea)
          // const comprobanteRef = ref(db, rtdbPath);
          // await remove(comprobanteRef);
          
          migrados++;
          detalles.push(`✅ Pago ${pago.id}: Migrado exitosamente`);
        } else {
          errores++;
          detalles.push(`❌ Pago ${pago.id}: Error en migración`);
        }
      } catch (error) {
        errores++;
        detalles.push(`❌ Pago ${pago.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    
    return {
      total: pagosConComprobanteRTDB.length,
      migrados,
      errores,
      detalles
    };
    
  } catch (error) {
    console.error('Error en migración:', error);
    detalles.push(`❌ Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return {
      total: 0,
      migrados,
      errores: errores + 1,
      detalles
    };
  }
}
