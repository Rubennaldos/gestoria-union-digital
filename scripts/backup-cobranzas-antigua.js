/**
 * Script de Backup: Sistema de Cobranzas Antiguo
 * 
 * Este script exporta los datos del sistema antiguo de cobranzas antes de eliminarlo.
 * Ejecuta este script ANTES de eliminar el nodo 'cobranzas/' de Firebase RTDB.
 * 
 * Uso:
 *   node scripts/backup-cobranzas-antigua.js
 * 
 * El backup se guardará en: backups/cobranzas-antigua-[timestamp].json
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
const fs = require('fs');
const path = require('path');

// Configuración de Firebase (usa las mismas credenciales de tu proyecto)
const firebaseConfig = {
  // IMPORTANTE: Completa con tus credenciales de Firebase
  // Puedes copiarlas de src/config/firebase.ts
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  databaseURL: "TU_DATABASE_URL",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

async function backupCobranzasAntigua() {
  console.log('🔄 Iniciando backup del sistema antiguo de cobranzas...\n');

  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  try {
    // Obtener todos los datos del nodo 'cobranzas/'
    console.log('📥 Descargando datos de cobranzas/...');
    const cobranzasRef = ref(db, 'cobranzas');
    const snapshot = await get(cobranzasRef);

    if (!snapshot.exists()) {
      console.log('⚠️  El nodo cobranzas/ no existe o está vacío');
      return;
    }

    const data = snapshot.val();
    
    // Estadísticas del backup
    const stats = {
      configuracion: data.configuracion ? 'Sí' : 'No',
      cargos: data.cargos ? Object.keys(data.cargos).length : 0,
      pagos: data.pagos ? Object.keys(data.pagos).length : 0,
      pagos_index: data.pagos_index ? Object.keys(data.pagos_index).length : 0,
      periods: data.periods ? Object.keys(data.periods).length : 0,
      charges: data.charges ? Object.keys(data.charges).length : 0,
      sanciones: data.sanciones ? Object.keys(data.sanciones).length : 0,
    };

    console.log('\n📊 Estadísticas del backup:');
    console.log('   - Configuración:', stats.configuracion);
    console.log('   - Cargos:', stats.cargos);
    console.log('   - Pagos:', stats.pagos);
    console.log('   - Índice de pagos:', stats.pagos_index);
    console.log('   - Períodos:', stats.periods);
    console.log('   - Charges:', stats.charges);
    console.log('   - Sanciones:', stats.sanciones);

    // Crear directorio de backups si no existe
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `cobranzas-antigua-${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    // Guardar backup
    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        fecha: new Date().toLocaleString('es-PE'),
        sistema: 'cobranzas (antiguo)',
        nota: 'Backup realizado antes de migración a cobranzas_v2'
      },
      stats,
      data
    };

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('\n✅ Backup completado exitosamente');
    console.log('📁 Archivo guardado en:', filepath);
    console.log('💾 Tamaño:', (fs.statSync(filepath).size / 1024).toFixed(2), 'KB');

    console.log('\n⚠️  IMPORTANTE:');
    console.log('   1. Verifica que el archivo de backup esté completo');
    console.log('   2. Haz una copia adicional del archivo en un lugar seguro');
    console.log('   3. Solo entonces procede a eliminar el nodo en Firebase Console');

  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    throw error;
  }
}

// Ejecutar el backup
backupCobranzasAntigua()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

