// scripts/migrarArchivosFirebase.ts

/**
 * Script de migración de archivos antiguos de Realtime Database a Firebase Storage.
 * Ejecutar con: npx ts-node scripts/migrarArchivosFirebase.ts
 */

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update, set, child } from "firebase/database";
import { uploadFileAndGetURL } from "../src/services/FileStorageService";
import { app as firebaseApp } from "../src/config/firebase";

// 1. Instrucciones de copia de seguridad
console.log("============================");
console.log("INSTRUCCIONES DE BACKUP ANTES DE MIGRAR");
console.log("1. Ve a https://console.firebase.google.com/");
console.log("2. Selecciona tu proyecto y entra a Database > Realtime Database");
console.log("3. Haz clic en los tres puntos (⋮) arriba a la derecha y elige 'Exportar JSON'.");
console.log("4. Guarda el archivo exportado en un lugar seguro antes de continuar.");
console.log("============================\n");

// 2. Inicializar Firebase
const app = firebaseApp; // Usa la config existente
const db = getDatabase(app);

async function migrarComprobantes() {
  console.log("Iniciando migración de comprobantes de finanzas...");
  const comprobantesRef = ref(db, "finanzas/comprobantes");
  const snapshot = await get(comprobantesRef);
  if (!snapshot.exists()) {
    console.log("No se encontraron comprobantes para migrar.");
    return;
  }
  const movimientos = snapshot.val();
  for (const movimientoId in movimientos) {
    const comprobantes = movimientos[movimientoId];
    for (const timestamp in comprobantes) {
      const comprobante = comprobantes[timestamp];
      if (!comprobante.url || comprobante.url === "") {
        if (comprobante.archivo && typeof comprobante.archivo === "string" && comprobante.archivo.startsWith("data:")) {
          console.log(`Migrando comprobante ${movimientoId}/${timestamp}...`);
          const url = await uploadFileAndGetURL(comprobante.archivo, "comprobantes");
          await update(ref(db, `finanzas/comprobantes/${movimientoId}/${timestamp}`), { url });
          console.log(`Comprobante migrado. URL: ${url}`);
        } else {
          console.log(`Comprobante ${movimientoId}/${timestamp} no tiene archivo base64 para migrar.`);
        }
      }
    }
  }
  console.log("Migración de comprobantes finalizada.\n");
}

async function migrarImagenesEventos() {
  console.log("Iniciando migración de imágenes de eventos...");
  const eventosRef = ref(db, "eventos");
  const snapshot = await get(eventosRef);
  if (!snapshot.exists()) {
    console.log("No se encontraron eventos para migrar.");
    return;
  }
  const eventos = snapshot.val();
  for (const eventoId in eventos) {
    const evento = eventos[eventoId];
    if (evento.imagen && typeof evento.imagen === "string" && evento.imagen.startsWith("data:")) {
      console.log(`Migrando imagen del evento ${eventoId}...`);
      const url = await uploadFileAndGetURL(evento.imagen, "eventos");
      await update(ref(db, `eventos/${eventoId}`), { imagen: url });
      console.log(`Imagen migrada. URL: ${url}`);
    }
  }
  console.log("Migración de imágenes de eventos finalizada.\n");
}

(async () => {
  await migrarComprobantes();
  await migrarImagenesEventos();
  console.log("\nMigración completa. Revisa la consola para ver los detalles de cada registro migrado.");
})();
